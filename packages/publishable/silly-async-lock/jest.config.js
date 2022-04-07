module.exports = {
  displayName: 'silly-async-lock',
  preset: '../../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  collectCoverage: true,
  collectCoverageFrom: ['**/*.ts'],
  coveragePathIgnorePatterns: ['<rootDir>/.*index.ts'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  coverageReporters: ['lcov', 'text'],
  coverageDirectory: '../../../coverage/packages/publishable/silly-async-lock',
};
