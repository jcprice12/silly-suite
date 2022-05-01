import { DecoratedMethodParamFactory } from '@silly-suite/silly-decorator';
import { SillyLockFacilitator } from './silly-lock-facilitator';

export function UseSillyLockForPromise<K>(
  getSillyLock: DecoratedMethodParamFactory<SillyLockFacilitator<K>>,
  getSillyLockKey: DecoratedMethodParamFactory<K>
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value = new Proxy(descriptor.value, {
      apply: async function (original, thiz: unknown, args: Array<unknown>) {
        const decoratedMethodData = {
          thiz,
          target,
          propertyKey,
          args,
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
