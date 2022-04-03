export type AllowedDynamoKeyType = string | number | boolean;

export interface DynamoKeyValue {
  hashKeyValue: AllowedDynamoKeyType;
  rangeKeyValue?: AllowedDynamoKeyType;
}

export interface DynamoKeyDefinition {
  hashKeyName: string;
  rangeKeyName?: string;
}
