import { AllowedDynamoKeyType } from './dynamo-key.model';

export interface BaseLockItem {
  leaseDuration: number;
  recordVersionNumber: string;
  ownerName: string;
}

export interface NormalizedLockItem extends BaseLockItem {
  hashKey: AllowedDynamoKeyType;
  rangeKey?: AllowedDynamoKeyType;
}
