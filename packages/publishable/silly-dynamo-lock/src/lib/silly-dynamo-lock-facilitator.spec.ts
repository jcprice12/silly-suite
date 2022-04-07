import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { sleep } from '@silly-suite/silly-sleep';
import { DynamoKeyDefinition, DynamoKeyValue } from './dynamo-key.model';
import { LockAcquisitionAttemptsExhaustedError } from './lock-acquisition-attempts-exhausted.error';
import { BaseLockItem } from './lock-item.model';
import { SillyDynamoLockFacilitator } from './silly-dynamo-lock-facilitator';

const tableName = 'TestTable'; //see jest-dynalite-config.js
const keyDefinition: Required<DynamoKeyDefinition> = {
  hashKeyName: 'hk', //see jest-dynalite-config.js
  rangeKeyName: 'rk', //see jest-dynalite-config.js
};
function createSillDynamoLockFacilitator(
  dynamoClient: DynamoDBClient
): SillyDynamoLockFacilitator {
  return new SillyDynamoLockFacilitator({
    dynamoClient,
    heartbeatInterval: 50,
    leaseDuration: 200,
    maxAttemptsToAcquireLock: 10,
    keyDefinition,
    tableName,
    ownerName: 'app1',
  });
}
const mockLockKey: Required<DynamoKeyValue> = {
  hashKeyValue: 'foo',
  rangeKeyValue: 'bar',
};

describe('Given an actual dynamodb client', () => {
  let client: DynamoDBClient;

  const expectLockToBeReleased = async (): Promise<void> => {
    const itemOutput = await client.send(
      new GetItemCommand({
        TableName: tableName,
        Key: marshall({
          [keyDefinition.hashKeyName]: mockLockKey.hashKeyValue,
          [keyDefinition.rangeKeyName]: mockLockKey.rangeKeyValue,
        }),
      })
    );
    const item = itemOutput.Item
      ? (unmarshall(itemOutput.Item) as unknown as BaseLockItem)
      : undefined;
    expect(item?.leaseDuration).toEqual(0);
  };

  beforeEach(() => {
    jest.setTimeout(15000);
    client = new DynamoDBClient({
      endpoint: process.env['MOCK_DYNAMODB_ENDPOINT'],
      tls: false,
      region: 'local',
    });
  });

  afterEach(() => {
    client.destroy();
  });

  describe('Given a silly dynamo lock facilitator', () => {
    let sillyLockFacilitator: SillyDynamoLockFacilitator;
    beforeEach(() => {
      sillyLockFacilitator = createSillDynamoLockFacilitator(client);
    });

    describe('Given a critical operation to execute', () => {
      let criticalOperationSpy: jest.Mock;
      let criticalOperationState = 0;

      const getCriticalOperation = (timeDelay: number) => {
        return async () => {
          criticalOperationState += 1;
          await sleep(timeDelay);
          criticalOperationSpy(criticalOperationState);
          criticalOperationState -= 1;
        };
      };
      const createManyProcesses = (
        numberOfProcesses: number,
        criticalOperation: () => Promise<void>
      ) => {
        const processes = [];
        for (let i = 0; i < numberOfProcesses; i++) {
          processes.push(
            sillyLockFacilitator.executeCriticalSectionWhenLockAcquired(
              mockLockKey,
              criticalOperation
            )
          );
        }
        return processes;
      };

      beforeEach(() => {
        criticalOperationSpy = jest.fn();
        criticalOperationState = 0;
      });

      describe('When many async processes all attempt to execute randomly short-lived critical operation under same lock', () => {
        const maxTimeForCriticalOperationToRun = 20;
        const numberOfProcesses = 3;

        beforeEach(async () => {
          await Promise.all(
            createManyProcesses(
              numberOfProcesses,
              getCriticalOperation(
                Math.random() * maxTimeForCriticalOperationToRun
              )
            )
          );
        });

        it('Then only one worker will have been executing critical operation at a time and all processes finish', () => {
          expect(criticalOperationSpy).toHaveBeenCalledTimes(numberOfProcesses);
          expect(
            criticalOperationSpy.mock.calls[0].every(
              (call: number) => call === 1
            )
          );
        });

        it('Then lock will eventually be released after all processes have executed', async () => {
          await expectLockToBeReleased();
        });
      });

      describe('When many async processes all attempt to execute a critical operation that takes longer than the heartbeat', () => {
        const lengthOfTimeForCriticalOperationToExecute = 75;
        const numberOfProcesses = 3;

        beforeEach(async () => {
          await Promise.all(
            createManyProcesses(
              numberOfProcesses,
              getCriticalOperation(lengthOfTimeForCriticalOperationToExecute)
            )
          );
        });

        it('Then only one worker will have been executing critical operation at a time and all processes finish', () => {
          expect(criticalOperationSpy).toHaveBeenCalledTimes(numberOfProcesses);
          expect(
            criticalOperationSpy.mock.calls[0].every(
              (call: number) => call === 1
            )
          );
        });

        it('Then lock will eventually be released after all processes have executed', async () => {
          await expectLockToBeReleased();
        });
      });

      describe('When too many async processes all attempt to execute a critical operation', () => {
        const lengthOfTimeForCriticalOperationToExecute = 20;
        const numberOfProcesses = 11;
        let results: Array<PromiseSettledResult<void>>;

        beforeEach(async () => {
          results = await Promise.allSettled(
            createManyProcesses(
              numberOfProcesses,
              getCriticalOperation(lengthOfTimeForCriticalOperationToExecute)
            )
          );
        });

        it('Then only one worker will have been executing critical operation at a time', () => {
          expect(
            criticalOperationSpy.mock.calls[0].every(
              (call: number) => call === 1
            )
          );
        });

        it('Then an error is thrown indicating that the lock could not be acquired with the given number of attempts', () => {
          expect(
            results.find(
              (result) =>
                result.status === 'rejected' &&
                result.reason instanceof LockAcquisitionAttemptsExhaustedError
            )
          ).toBeDefined();
        });
      });
    });
  });
});

describe('Given a mocked dynamo client', () => {
  let sendMock: jest.Mock;
  let client: DynamoDBClient;
  beforeEach(() => {
    sendMock = jest.fn();
    client = {
      send: sendMock,
    } as unknown as DynamoDBClient;
  });

  describe('Given a silly dynamo lock facilitator', () => {
    let sillyLockFacilitator: SillyDynamoLockFacilitator;
    beforeEach(() => {
      sillyLockFacilitator = createSillDynamoLockFacilitator(client);
    });

    describe('Given an unexpected error will occur communicating with dynamo', () => {
      let originalError: Error;
      beforeEach(() => {
        originalError = new Error('foo');
        sendMock.mockRejectedValue(originalError);
      });

      describe('When attempting to execute a critical operation under dynamo lock', () => {
        let error: Error;

        beforeEach(async () => {
          try {
            await sillyLockFacilitator.executeCriticalSectionWhenLockAcquired(
              { hashKeyValue: 'foo', rangeKeyValue: 'bar' },
              () => Promise.resolve(42)
            );
          } catch (e) {
            error = e as Error;
          }
        });

        it('Then the original unexepected error is thrown', () => {
          expect(error).toBe(originalError);
        });
      });
    });
  });
});
