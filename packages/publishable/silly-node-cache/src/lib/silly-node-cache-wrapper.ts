import {
  SillyCacheMissError,
  SillyCacheWrapper,
  SillyCache,
} from '@silly-suite/silly-cache';
import NodeCache = require('node-cache');

export class SillyNodeCacheWrapper
  implements SillyCache<string | number>, SillyCacheWrapper<NodeCache>
{
  constructor(public readonly underlyingCache: NodeCache) {}

  public getCacheValue<V>(cacheKey: string | number): V {
    const cacheValue = this.underlyingCache.get<V>(cacheKey);
    if (cacheValue !== undefined) {
      return cacheValue;
    }
    throw new SillyCacheMissError(`Cache miss for key ${cacheKey}`);
  }

  public setCacheValue<V>(cacheKey: string | number, cacheValue: V): void {
    this.underlyingCache.set(cacheKey, cacheValue);
  }
}
