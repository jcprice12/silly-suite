import { SillyCacheWrapper } from "@silly/cache";
import NodeCache = require("node-cache");

export class SillyNodeCacheWrapper
  implements SillyCacheWrapper<string | number, NodeCache>
{
  constructor(public readonly underlyingCache: NodeCache) {}

  public getCacheValue<V>(cacheKey: string | number): Promise<V | undefined> {
    const cacheValue = this.underlyingCache.get<V>(cacheKey);
    return Promise.resolve(cacheValue);
  }

  public async setCacheValue<V>(
    cacheKey: string | number,
    cacheValue: V
  ): Promise<void> {
    this.underlyingCache.set(cacheKey, cacheValue);
  }
}
