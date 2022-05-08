import { isPromise } from '@silly-suite/silly-promise-check';
import { sleep } from '@silly-suite/silly-sleep';
import { isObservable, Observable } from 'rxjs';
import { delay, retryWhen, tap } from 'rxjs/operators';
import { BackoffStrategy, FixedBackoffStrategy } from './backoff.strategy';
import { AlwaysRetry, RetryCondition } from './retry.condition';

export interface RetryDecoratorOptions<E> {
  retryAttempts?: number;
  backoffStrategy?: BackoffStrategy;
  retryCondition?: RetryCondition<E>;
}

export function UseSillyRetry<E>(options: RetryDecoratorOptions<E> = {}) {
  const finalOpts: Required<RetryDecoratorOptions<E>> =
    finalizeOptions(options);
  return function (
    _target: unknown,
    _propertyKey: unknown,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value = new Proxy(descriptor.value, {
      apply: function (original, thisArg: unknown, args: unknown[]) {
        function isAllowedToMakeAnotherAttempt(attemptsMade: number, error: E) {
          return (
            attemptsMade <= finalOpts.retryAttempts &&
            finalOpts.retryCondition.shouldRetry(error)
          );
        }

        async function executeMethodAsPromise<T>(
          promise: Promise<T>,
          attemptsMade: number
        ): Promise<unknown> {
          try {
            return await promise;
          } catch (e) {
            const error: E = e as E;
            attemptsMade += 1;
            if (isAllowedToMakeAnotherAttempt(attemptsMade, error)) {
              await sleep(
                finalOpts.backoffStrategy.getNextBackoffAmount(attemptsMade)
              );
              return executeMethodAsPromise(
                original.apply(thisArg, args),
                attemptsMade
              );
            }
            throw e;
          }
        }

        function executeMethodAsObservable<T>(
          val: Observable<T>
        ): Observable<T> {
          let attemptsMade = 0;
          return val.pipe(
            retryWhen((errors) => {
              return errors.pipe(
                tap(() => {
                  attemptsMade += 1;
                }),
                tap((error: E) => {
                  if (!isAllowedToMakeAnotherAttempt(attemptsMade, error)) {
                    throw error;
                  }
                }),
                delay(
                  finalOpts.backoffStrategy.getNextBackoffAmount(attemptsMade)
                )
              );
            })
          );
        }

        const val = original.apply(thisArg, args);
        if (isPromise(val)) {
          return executeMethodAsPromise(val, 0);
        } else if (isObservable(val)) {
          return executeMethodAsObservable(val);
        }
        return val;
      },
    });
  };
}

function finalizeOption<T>(option: T | undefined, defaultOption: T): T {
  return option ?? defaultOption;
}

function finalizeOptions<E>(
  opts: RetryDecoratorOptions<E>
): Required<RetryDecoratorOptions<E>> {
  return {
    retryAttempts: finalizeOption(opts.retryAttempts, 2),
    backoffStrategy: finalizeOption(
      opts.backoffStrategy,
      new FixedBackoffStrategy(0)
    ),
    retryCondition: finalizeOption(opts.retryCondition, new AlwaysRetry()),
  };
}
