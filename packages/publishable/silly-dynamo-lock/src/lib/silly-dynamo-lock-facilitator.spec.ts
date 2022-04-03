import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoKeyValue } from './dynamo-key.model';
import { SillyDynamoLockFacilitator } from './silly-dynamo-lock-facilitator';

describe('Given a dynamodb client', () => {
  let client: DynamoDBClient;
  beforeEach(() => {
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
      sillyLockFacilitator = new SillyDynamoLockFacilitator({
        dynamoClient: client,
        heartbeatInterval: 300,
        keyDefinition: {
          hashKeyName: 'hk', //see jest-dynalite-config.js
          rangeKeyName: 'rk', //see jest-dynalite-config.js
        },
        leaseDuration: 1000,
        maxAttemptsToAcquireLock: 2,
        ownerName: 'app1',
        tableName: 'TestTable', //see jest-dynalite-config.js
      });
    });

    describe('Given a critical operation to execute', () => {
      let criticalOperationSpy: jest.Mock
      let criticalOperationState: number;
      let criticalOperation: () => Promise<void>;
      beforeEach(() => {
        criticalOperationSpy = jest.fn()
        criticalOperationState = 0;
        criticalOperation = async () => {
          criticalOperationState++
          function delayRandomTime() {
            return new Promise((r) => setTimeout(r, Math.random() * 100));
          }
          await delayRandomTime();
          criticalOperationSpy(criticalOperationState)
          criticalOperationState--;
        };
      });

      describe('When many async processes all attempt to execute critical operation under same lock', () => {
        let resolvedProcesses: void[];
        let lockKey: DynamoKeyValue;
        beforeEach(async () => {
          lockKey = {
            hashKeyValue: 'foo',
            rangeKeyValue: 'bar',
          };
          resolvedProcesses = await Promise.all([
            sillyLockFacilitator.executeCriticalSectionWhenLockAcquired(
              lockKey,
              criticalOperation
            ),
            sillyLockFacilitator.executeCriticalSectionWhenLockAcquired(
              lockKey,
              criticalOperation
            ),
            sillyLockFacilitator.executeCriticalSectionWhenLockAcquired(
              lockKey,
              criticalOperation
            ),
          ]);
        });

        it('Then only worker will have been executing critical operation at a time', () => {
          expect(criticalOperationSpy).toHaveBeenCalledTimes(resolvedProcesses.length)
          resolvedProcesses.forEach(() => {
            expect(criticalOperationSpy).toHaveBeenCalledWith(1)
          })
        });
      });
    });
  });
});
