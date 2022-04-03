import { DecoratedMethodParamFactory } from '@silly-suite/silly-decorator';
import { SillyCache } from './silly-cache';

export function UseSillyCacheForPromise<K, C, A, T>(
  getSillyCache: DecoratedMethodParamFactory<SillyCache<K>, C, A, T>,
  getSillyCacheKey: DecoratedMethodParamFactory<K, C, A, T>
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
