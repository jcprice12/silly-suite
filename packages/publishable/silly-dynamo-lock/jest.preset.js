const merge = require('merge');
const basePreset = require('../../../jest.preset');
const dynamoDbPreset = require('jest-dynalite/jest-preset');

module.exports = merge.recursive(basePreset, dynamoDbPreset);