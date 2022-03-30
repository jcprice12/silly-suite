import { SillyCache } from "./silly-cache";

export interface DecoratedMethodMetadata<T> {
  thiz: T;
  target: any;
  propertyKey: string;
}

export type DecoratedMethodParamFactory<P, T> = (
  metadata: DecoratedMethodMetadata<T>,
  ...decoratedMethodArgs: any[]
) => P;

export function UseSillyCacheForPromise<T, K>(
  getSillyCache: DecoratedMethodParamFactory<SillyCache<K>, T>,
  getSillyCacheKey: DecoratedMethodParamFactory<K, T>
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value = new Proxy(descriptor.value, {
      apply: async function (original, thiz: T, args: any[]) {
        const metadata = { thiz, target, propertyKey };
        const cache = getSillyCache(metadata, ...args);
        const cacheKey = getSillyCacheKey(metadata, ...args);
        const cachedVal = await cache.getCacheValue(cacheKey);
        if (!isCacheMiss(cachedVal)) {
          return cachedVal;
        }
        const originalReturnValue = await original.apply(thiz, args);
        await cache.setCacheValue(cacheKey, originalReturnValue);
        return originalReturnValue;
      }
    });
  };
}

function isCacheMiss(val: any): boolean {
  return val === undefined || val === null;
}