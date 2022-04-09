import { sleep } from '@silly-suite/silly-sleep';
import { BackoffStrategy, FixedBackoffStrategy } from './backoff.strategy';
import { AlwaysRetry, RetryCondition } from './retry.condition';

export interface RetryDecoratorOptions<E> {
  retryAttempts?: number;
  backoffStrategy?: BackoffStrategy;
  retryCondition?: RetryCondition<E>;
}

export function UseSillyRetryForPromise<E>(
  options: RetryDecoratorOptions<E> = {}
) {
  const finalOpts: Required<RetryDecoratorOptions<E>> =
    finalizeOptions(options);
  return function (
    _target: unknown,
    _propertyKey: unknown,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value = new Proxy(descriptor.value, {
      apply: function (original, thisArg: unknown, args: unknown[]) {
        async function executeMethod(
          attemptsLeft: number,
          attemptsMade: number,
          lastError: E | null
        ): Promise<unknown> {
          if (
            attemptsLeft <= 0 ||
            (lastError && !finalOpts.retryCondition.shouldRetry(lastError))
          ) {
            throw lastError;
          }
          if (attemptsMade > 0) {
            await sleep(
              finalOpts.backoffStrategy.getNextBackoffAmount(attemptsMade)
            );
          }
          try {
            return await original.apply(thisArg, args);
          } catch (e) {
            const error: E = e as E;
            return executeMethod(attemptsLeft - 1, attemptsMade + 1, error);
          }
        }
        return executeMethod(finalOpts.retryAttempts + 1, 0, null);
      },
    });
  };
}

function resolveOption<T>(option: T | undefined, defaultOption: T): T {
  return option ?? defaultOption;
}

function finalizeOptions<E>(
  opts: RetryDecoratorOptions<E>
): Required<RetryDecoratorOptions<E>> {
  return {
    retryAttempts: resolveOption(opts.retryAttempts, 2),
    backoffStrategy: resolveOption(
      opts.backoffStrategy,
      new FixedBackoffStrategy(0)
    ),
    retryCondition: resolveOption(opts.retryCondition, new AlwaysRetry()),
  };
}
