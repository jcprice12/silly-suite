import NodeCache = require('node-cache');
import { SillyCacheMissError } from '@silly-suite/silly-cache';
import { SillyNodeCacheWrapper } from './silly-node-cache-wrapper';

describe('Given a node cache', () => {
  let nodeCache: NodeCache;
  beforeEach(() => {
    nodeCache = new NodeCache();
  });

  describe('Given a silly node cache wrapper', () => {
    let sillyNodeCacheWrapper: SillyNodeCacheWrapper;
    beforeEach(() => {
      sillyNodeCacheWrapper = new SillyNodeCacheWrapper(nodeCache);
    });

    describe('When getting underlying cache', () => {
      let underlyingCache: NodeCache;
      beforeEach(() => {
        underlyingCache = sillyNodeCacheWrapper.underlyingCache;
      });

      it('Then the underlying cache can be retrieved', () => {
        expect(underlyingCache).toBe(nodeCache);
      });
    });

    describe('When getting cache value before one is set', () => {
      let error: Error;
      const cacheKey = 'foo';
      beforeEach(() => {
        try {
          sillyNodeCacheWrapper.getCacheValue(cacheKey);
        } catch (e) {
          error = e as Error;
        }
      });

      it('Then cache miss error is thrown', () => {
        expect(error).toBeInstanceOf(SillyCacheMissError);
        expect(error.message).toBe(`Cache miss for key ${cacheKey}`);
      });
    });

    describe('Given a value is set in silly node cache wrapper', () => {
      const cacheValue = 42;
      const cacheKey = 'foo';
      beforeEach(() => {
        sillyNodeCacheWrapper.setCacheValue(cacheKey, cacheValue);
      });

      describe('When cached value is retrieved from silly node cache wrapper', () => {
        let result: number | undefined;
        beforeEach(() => {
          result = sillyNodeCacheWrapper.getCacheValue(cacheKey);
        });

        it('Then the cached value is returned', () => {
          expect(result).toEqual(cacheValue);
        });
      });
    });
  });
});
