import { DecoratedMethodParamFactory } from '@silly-suite/silly-decorator';
import { isObservable, Observable, of, throwError } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import {
  SillyCache,
  SillyObservableCache,
  SillyPromiseCache,
} from './silly-cache';

export function UseSillyCacheForPromise<K>(
  getSillyCache: DecoratedMethodParamFactory<
    SillyPromiseCache<K> | SillyCache<K>
  >,
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
            // do nothing
          }
          return originalReturnValue;
        }
      },
    });
  };
}

export function UseSillyCacheForObservable<K>(
  getSillyCache: DecoratedMethodParamFactory<
    SillyObservableCache<K> | SillyCache<K>
  >,
  getSillyCacheKey: DecoratedMethodParamFactory<K>
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    descriptor.value = new Proxy(descriptor.value, {
      apply: function (original, thiz: unknown, args: Array<unknown>) {
        const decoratedMethodData = {
          thiz,
          target,
          propertyKey,
          args,
        };
        const cache = getSillyCache(decoratedMethodData);
        const cacheKey = getSillyCacheKey(decoratedMethodData);
        return asObservable(() => cache.getCacheValue(cacheKey)).pipe(
          catchError(() =>
            original.apply(thiz, args).pipe(
              concatMap((originalReturnValue) =>
                asObservable(() =>
                  cache.setCacheValue(cacheKey, originalReturnValue)
                ).pipe(
                  catchError(() => of(null)),
                  map(() => originalReturnValue)
                )
              )
            )
          )
        );
      },
    });
  };
}

function asObservable<T>(f: () => T | Observable<T>): Observable<T | never> {
  try {
    const val = f();
    return isObservable(val) ? val : of(val);
  } catch (e) {
    return throwError(e);
  }
}
