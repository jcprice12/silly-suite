import { DecoratedMethodParamFactory } from '@silly-suite/silly-decorator';
import { SillyPromiseCache } from './silly-cache';

export function UseSillyCacheForPromise<K>(
  getSillyCache: DecoratedMethodParamFactory<SillyPromiseCache<K>>,
  getSillyCacheKey: DecoratedMethodParamFactory<K>
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
        const cache = getSillyCache(decoratedMethodData);
        const cacheKey = getSillyCacheKey(decoratedMethodData);
        try {
          return await cache.getCacheValue(cacheKey);
        } catch {
          const originalReturnValue = await original.apply(thiz, args);
          try {
            await cache.setCacheValue(cacheKey, originalReturnValue);
          } catch {
            //do nothing
          }
          return originalReturnValue;
        }
      },
    });
  };
}
