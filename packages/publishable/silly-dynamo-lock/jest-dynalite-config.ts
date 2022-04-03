module.exports = {
  tables: [
    {
      TableName: "TestTable",
      KeySchema: [
        { AttributeName: "hk", KeyType: "HASH" },
        { AttributeName: "rk", KeyType: "RANGE" }
      ],
      AttributeDefinitions: [
        { AttributeName: "hk", AttributeType: "S" },
        { AttributeName: "rk", AttributeType: "S" }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    },
  ],
  basePort: 8000,
};