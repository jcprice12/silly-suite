export interface RetryCondition<E> {
  shouldRetry(error: E): boolean;
}

export class AlwaysRetry implements RetryCondition<unknown> {
  shouldRetry(): boolean {
    return true;
  }
}

export class RetryOnGivenErrorClasses<E extends Error>
  implements RetryCondition<E>
{
  constructor(
    private readonly errorsToRetryOn: Array<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (...args: Array<any>): E;
    }>
  ) {}

  shouldRetry(error: E) {
    return this.errorsToRetryOn.some((e) => error instanceof e);
  }
}
