import { Observable } from 'rxjs';

export interface SillyPromiseCache<K> {
  getCacheValue<V>(cacheKey: K): Promise<V>;
  setCacheValue<V>(cacheKey: K, cacheValue: V): Promise<void>;
}

export interface SillyObservableCache<K> {
  getCacheValue<V>(cacheKey: K): Observable<V>;
  setCacheValue<V>(cacheKey: K, cacheValue: V): Observable<void>;
}

export interface SillyCacheWrapper<U> {
  underlyingCache: U;
}
