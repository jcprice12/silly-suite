import { DecoratedMethodParamFactory } from '@silly-suite/silly-decorator';
import { SillyLockFacilitator } from './silly-lock-facilitator';

export function UseSillyLockForPromise<K, C, A, T>(
  getSillyLock: DecoratedMethodParamFactory<SillyLockFacilitator<K>, C, A, T>,
  getSillyLockKey: DecoratedMethodParamFactory<K, C, A, T>
) {
  return function (
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value = new Proxy(descriptor.value, {
      apply: async function (original, thiz: C, args: Array<A>) {
        const decoratedMethodData = {
          thiz,
          target,
          propertyKey,
          args: args as unknown as A,
        };
        const sillyLock = getSillyLock(decoratedMethodData);
        const sillyLockKey = getSillyLockKey(decoratedMethodData);
        return sillyLock.executeCriticalSectionWhenLockAcquired(
          sillyLockKey,
          async () => {
            return await original.apply(thiz, args);
          }
        );
      },
    });
  };
}
