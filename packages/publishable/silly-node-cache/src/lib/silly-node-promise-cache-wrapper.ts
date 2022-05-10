import {
  SillyCacheMissError,
  SillyCacheWrapper,
  SillyPromiseCache,
} from '@silly-suite/silly-cache';
import NodeCache = require('node-cache');

export class SillyNodePromiseCacheWrapper
  implements SillyPromiseCache<string | number>, SillyCacheWrapper<NodeCache>
{
  constructor(public readonly underlyingCache: NodeCache) {}

  public getCacheValue<V>(cacheKey: string | number): Promise<V> {
    const cacheValue = this.underlyingCache.get<V>(cacheKey);
    if (cacheValue !== undefined) {
      return Promise.resolve(cacheValue);
    }
    return Promise.reject(
      new SillyCacheMissError(`Cache miss for key ${cacheKey}`)
    );
  }

  public async setCacheValue<V>(
    cacheKey: string | number,
    cacheValue: V
  ): Promise<void> {
    this.underlyingCache.set(cacheKey, cacheValue);
  }
}
