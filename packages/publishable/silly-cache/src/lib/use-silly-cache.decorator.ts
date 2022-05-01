import { DecoratedMethodParamFactory } from '@silly-suite/silly-decorator';
import { SillyCache } from './silly-cache';

export function UseSillyCacheForPromise<K>(
  getSillyCache: DecoratedMethodParamFactory<SillyCache<K>>,
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
        const cachedVal = await cache.getCacheValue(cacheKey);
        if (!isCacheMiss(cachedVal)) {
          return cachedVal;
        }
        const originalReturnValue = await original.apply(thiz, args);
        await cache.setCacheValue(cacheKey, originalReturnValue);
        return originalReturnValue;
      },
    });
  };
}

function isCacheMiss(val: unknown): boolean {
  return val === undefined || val === null;
}
