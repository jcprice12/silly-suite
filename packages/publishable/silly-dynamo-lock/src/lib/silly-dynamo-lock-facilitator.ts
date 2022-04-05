import {
  AttributeValue,
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { SillyLockFacilitator } from '@silly-suite/silly-lock';
import { sleep } from '@silly-suite/silly-sleep';
import { pick } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  AllowedDynamoKeyType,
  DynamoKeyDefinition,
  DynamoKeyValue,
} from './dynamo-key.model';
import { LockAcquisitionAttemptsExhaustedError } from './lock-acquisition-attempts-exhausted.error';
import { BaseLockItem, NormalizedLockItem } from './lock-item.model';

export interface SillyDynamoLockFacilitatorConfig {
  dynamoClient: DynamoDBClient;
  tableName: string;
  keyDefinition: DynamoKeyDefinition;
  ownerName: string;
  leaseDuration: number;
  heartbeatInterval: number;
  maxAttemptsToAcquireLock: number;
}

export class SillyDynamoLockFacilitator
  implements SillyLockFacilitator<DynamoKeyValue>
{
  private readonly releasedLockLeaseDuration = 0;
  private readonly lockDoesNotExistConditionConfig: {
    conditionExpression: string;
    expressionAttributeNames: Record<string, string>;
  };
  constructor(private readonly config: SillyDynamoLockFacilitatorConfig) {
    this.lockDoesNotExistConditionConfig =
      this.createConfigForLockDoesNotExistExpression();
  }

  public async executeCriticalSectionWhenLockAcquired<V>(
    lockKey: DynamoKeyValue,
    executeCriticalSection: () => Promise<V>
  ): Promise<V> {
    const lockItem = await this.acquireLock(lockKey);
    let isReleased = false;
    const maintainLock = async (previousRecordVersionNumber: string) => {
      await sleep(this.config.heartbeatInterval);
      if (!isReleased) {
        try {
          const updatedLockItem = await this.leaseExistingLockItem(
            lockKey,
            previousRecordVersionNumber
          );
          maintainLock(updatedLockItem.recordVersionNumber);
        } catch (e) {
          //heartbeat failed, possibility that another method invocation will execute critical section at same time as this method invocation
        }
      }
    };
    maintainLock(lockItem.recordVersionNumber);
    let result: V;
    try {
      result = await executeCriticalSection();
    } finally {
      isReleased = true;
      this.releaseLockItem(lockKey, lockItem.recordVersionNumber);
    }
    return result;
  }

  private async acquireLock(
    lockKey: DynamoKeyValue,
    attempt = 0
  ): Promise<NormalizedLockItem> {
    if (attempt < this.config.maxAttemptsToAcquireLock) {
      const currentLockItem = await this.getLockItem(lockKey);
      try {
        let newLockItem: NormalizedLockItem;
        if (currentLockItem) {
          await sleep(currentLockItem.leaseDuration);
          newLockItem = await this.leaseExistingLockItem(
            lockKey,
            currentLockItem.recordVersionNumber
          );
        } else {
          newLockItem = await this.leaseNewLockItem(lockKey);
        }
        return newLockItem;
      } catch (e) {
        if (e instanceof ConditionalCheckFailedException) {
          return await this.acquireLock(lockKey, attempt++);
        }
        throw e;
      }
    }
    throw new LockAcquisitionAttemptsExhaustedError();
  }

  private async getLockItem(
    lockKey: DynamoKeyValue
  ): Promise<NormalizedLockItem | undefined> {
    const output = await this.config.dynamoClient.send(
      new GetItemCommand({
        TableName: this.config.tableName,
        Key: this.createMarshalledKey(lockKey),
        ConsistentRead: true,
      })
    );
    const lockItem = output.Item;
    if (lockItem) {
      return this.normalizeLockItem(
        lockKey,
        unmarshall(lockItem) as BaseLockItem
      );
    }
    return undefined;
  }

  private async releaseLockItem(
    lockKey: DynamoKeyValue,
    previousRecordVersionNumber: string
  ): Promise<void> {
    try {
      await this.safelyUpdateLockItem(lockKey, previousRecordVersionNumber, {
        ...this.createUnmarshalledKey(lockKey),
        ownerName: this.config.ownerName,
        leaseDuration: this.releasedLockLeaseDuration,
        recordVersionNumber: previousRecordVersionNumber,
      });
    } catch {
      //release failed, other method invocations may wait a bit longer than normal to acquire lock
    }
  }

  private async leaseNewLockItem(
    lockKey: DynamoKeyValue
  ): Promise<NormalizedLockItem> {
    const lockItem = this.createLeasedLockItem(lockKey);
    await this.config.dynamoClient.send(
      new PutItemCommand({
        TableName: this.config.tableName,
        Item: marshall(lockItem),
        ConditionExpression:
          this.lockDoesNotExistConditionConfig.conditionExpression,
        ExpressionAttributeNames:
          this.lockDoesNotExistConditionConfig.expressionAttributeNames,
      })
    );
    return this.normalizeLockItem(lockKey, lockItem);
  }

  private async leaseExistingLockItem(
    lockKey: DynamoKeyValue,
    previousRecordVersionNumber: string
  ): Promise<NormalizedLockItem> {
    const lockItem = this.createLeasedLockItem(lockKey);
    return this.safelyUpdateLockItem(
      lockKey,
      previousRecordVersionNumber,
      lockItem
    );
  }

  private async safelyUpdateLockItem(
    lockKey: DynamoKeyValue,
    previousRecordVersionNumber: string,
    updatedLockItem: { [x: string]: AllowedDynamoKeyType } & BaseLockItem
  ): Promise<NormalizedLockItem> {
    await this.config.dynamoClient.send(
      new PutItemCommand({
        TableName: this.config.tableName,
        Item: marshall(updatedLockItem),
        ConditionExpression: `${this.lockDoesNotExistConditionConfig.conditionExpression} OR recordVersionNumber = :previousRecordVersionNumber`,
        ExpressionAttributeNames:
          this.lockDoesNotExistConditionConfig.expressionAttributeNames,
        ExpressionAttributeValues: marshall({
          ':previousRecordVersionNumber': previousRecordVersionNumber,
        }),
      })
    );
    return this.normalizeLockItem(lockKey, updatedLockItem);
  }

  private normalizeLockItem<I extends BaseLockItem>(
    lockKey: DynamoKeyValue,
    item: I
  ): NormalizedLockItem {
    const baseLockItem = pick(
      item,
      'leaseDuration',
      'ownerName',
      'recordVersionNumber'
    );
    return {
      ...baseLockItem,
      hashKey: lockKey.hashKeyValue,
      rangeKey: lockKey.rangeKeyValue,
    };
  }

  private createLeasedLockItem(
    lockKey: DynamoKeyValue
  ): { [x: string]: AllowedDynamoKeyType } & BaseLockItem {
    return {
      ...this.createUnmarshalledKey(lockKey),
      ownerName: this.config.ownerName,
      leaseDuration: this.config.leaseDuration,
      recordVersionNumber: uuidv4(),
    };
  }

  private createMarshalledKey(lockKey: DynamoKeyValue): {
    [key: string]: AttributeValue;
  } {
    return marshall(this.createUnmarshalledKey(lockKey));
  }

  private createUnmarshalledKey(lockKey: DynamoKeyValue): {
    [x: string]: string | number | boolean;
  } {
    const { hashKeyValue, rangeKeyValue } = lockKey;
    const unmarshalledKey: {
      [x: string]: string | number | boolean;
    } = {
      [this.config.keyDefinition.hashKeyName]: hashKeyValue,
    };
    if (this.config.keyDefinition.rangeKeyName && rangeKeyValue) {
      unmarshalledKey[this.config.keyDefinition.rangeKeyName] = rangeKeyValue;
    }
    return unmarshalledKey;
  }

  private createConfigForLockDoesNotExistExpression(): {
    conditionExpression: string;
    expressionAttributeNames: Record<string, string>;
  } {
    const attributeNames = [this.config.keyDefinition.hashKeyName];
    if (this.config.keyDefinition.rangeKeyName) {
      attributeNames.push(this.config.keyDefinition.rangeKeyName);
    }
    return this.createConfigForAttributesDoNotExistExpression(attributeNames);
  }

  private createConfigForAttributesDoNotExistExpression(
    attributeNames: Array<string>
  ): {
    conditionExpression: string;
    expressionAttributeNames: Record<string, string>;
  } {
    const conditionExpression = attributeNames
      .map((attributeName) => `attribute_not_exists(#${attributeName})`)
      .join(' AND ');
    const expressionAttributeNames = attributeNames
      .map((attributeName) => {
        const safeName = `#${attributeName}`;
        return {
          [safeName]: attributeName,
        };
      })
      .reduce((previous, current) => {
        return {
          ...previous,
          ...current,
        };
      }, {});

    return {
      conditionExpression,
      expressionAttributeNames,
    };
  }
}
