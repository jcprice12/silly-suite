import { AlwaysRetry, RetryOnGivenErrorClasses } from './retry.condition';

describe('Given the retry condition is to always retry', () => {
  let retryCondition: AlwaysRetry;
  beforeEach(() => {
    retryCondition = new AlwaysRetry();
  });
  describe('When determining to retry', () => {
    let shouldRetry: boolean;
    beforeEach(() => {
      shouldRetry = retryCondition.shouldRetry();
    });
    test('Then the decision should be to retry', () => {
      expect(shouldRetry).toBe(true);
    });
  });
});

describe('Given some error classes', () => {
  class FooError extends Error {}
  class BarError extends Error {}
  class BazError extends BarError {}

  describe.each([
    [[FooError], new FooError(), true],
    [[FooError], new BarError(), false],
    [[FooError, BarError], new BarError(), true],
    [[BarError], new BazError(), true],
    [[Error], new FooError(), true],
    [[FooError], new Error(), false],
    [[FooError], 'error' as unknown as Error, false],
  ])('Given %s to retry on', (errorClasses, thrownError, expected) => {
    let retryCondition: RetryOnGivenErrorClasses<Error>;
    beforeEach(() => {
      retryCondition = new RetryOnGivenErrorClasses(errorClasses);
    });

    describe('When determining to retry', () => {
      let shouldRetry: boolean;
      beforeEach(() => {
        shouldRetry = retryCondition.shouldRetry(thrownError);
      });
      test('Then the decision should be to retry', () => {
        expect(shouldRetry).toBe(expected);
      });
    });
  });
});
