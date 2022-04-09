import {
  BackoffStrategy,
  ExponentialBackoffStrategy,
  FixedBackoffStrategy,
  LinearBackoffStrategy,
} from './backoff.strategy';

describe('Given fixed backoff strategy', () => {
  let backoffStrategy: BackoffStrategy;
  let timeToWait: number;
  beforeEach(() => {
    timeToWait = 100;
    backoffStrategy = new FixedBackoffStrategy(timeToWait);
  });

  describe('When getting next backoff amount', () => {
    let nextBackoffAmount: number;
    beforeEach(() => {
      nextBackoffAmount = backoffStrategy.getNextBackoffAmount(0);
    });

    test('Then the next backoff amount is returned', () => {
      expect(nextBackoffAmount).toBe(timeToWait);
    });
  });
});

describe.each`
  timeToWaitBetweenEachAttempt | attempt | backoffDuration
  ${100}                       | ${0}    | ${0}
  ${100}                       | ${1}    | ${100}
  ${100}                       | ${2}    | ${200}
  ${100}                       | ${3}    | ${300}
  ${200}                       | ${0}    | ${0}
  ${200}                       | ${1}    | ${200}
  ${200}                       | ${2}    | ${400}
  ${200}                       | ${3}    | ${600}
`(
  'Given linear backoff strategy where timeToWait=$timeToWaitBetweenEachAttempt attempt=$attempt',
  ({ timeToWaitBetweenEachAttempt, attempt, backoffDuration }) => {
    let backoffStrategy: BackoffStrategy;
    beforeEach(() => {
      backoffStrategy = new LinearBackoffStrategy(timeToWaitBetweenEachAttempt);
    });

    describe('When getting next backoff amount', () => {
      let nextBackoffAmount: number;
      beforeEach(() => {
        nextBackoffAmount = backoffStrategy.getNextBackoffAmount(attempt);
      });

      test(`Then the next backoff amount is ${backoffDuration}`, () => {
        expect(nextBackoffAmount).toBe(backoffDuration);
      });
    });
  }
);

describe.each`
  base | multiplier | attempt | backoffDuration
  ${2} | ${100}     | ${0}    | ${0}
  ${2} | ${100}     | ${1}    | ${200}
  ${2} | ${100}     | ${2}    | ${400}
  ${2} | ${100}     | ${3}    | ${800}
  ${3} | ${200}     | ${0}    | ${0}
  ${3} | ${200}     | ${1}    | ${600}
  ${3} | ${200}     | ${2}    | ${1800}
  ${3} | ${200}     | ${3}    | ${5400}
`(
  'Given linear backoff strategy where base=$base multiplier=$multiplier attempt=$attempt',
  ({ base, multiplier, attempt, backoffDuration }) => {
    let backoffStrategy: BackoffStrategy;
    beforeEach(() => {
      backoffStrategy = new ExponentialBackoffStrategy(multiplier, base);
    });

    describe('When getting next backoff amount', () => {
      let nextBackoffAmount: number;
      beforeEach(() => {
        nextBackoffAmount = backoffStrategy.getNextBackoffAmount(attempt);
      });

      test(`Then the next backoff amount is ${backoffDuration}`, () => {
        expect(nextBackoffAmount).toBe(backoffDuration);
      });
    });
  }
);
