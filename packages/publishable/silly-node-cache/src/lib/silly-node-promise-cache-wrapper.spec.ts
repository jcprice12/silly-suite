import NodeCache = require('node-cache');
import { SillyCacheMissError } from '@silly-suite/silly-cache';
import { SillyNodePromiseCacheWrapper } from './silly-node-promise-cache-wrapper';

describe('Given a node cache', () => {
  let nodeCache: NodeCache;
  beforeEach(() => {
    nodeCache = new NodeCache();
  });

  describe('Given a silly node cache wrapper', () => {
    let sillyNodePromiseCacheWrapper: SillyNodePromiseCacheWrapper;
    beforeEach(() => {
      sillyNodePromiseCacheWrapper = new SillyNodePromiseCacheWrapper(
        nodeCache
      );
    });

    describe('When getting underlying cache', () => {
      let underlyingCache: NodeCache;
      beforeEach(() => {
        underlyingCache = sillyNodePromiseCacheWrapper.underlyingCache;
      });

      it('Then the underlying cache can be retrieved', () => {
        expect(underlyingCache).toBe(nodeCache);
      });
    });

    describe('When getting cache value before one is set', () => {
      let error: Error;
      const cacheKey = 'foo';
      beforeEach(async () => {
        try {
          await sillyNodePromiseCacheWrapper.getCacheValue(cacheKey);
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
      beforeEach(async () => {
        await sillyNodePromiseCacheWrapper.setCacheValue(cacheKey, cacheValue);
      });

      describe('When cached value is retrieved from silly node cache wrapper', () => {
        let result: number | undefined;
        beforeEach(async () => {
          result = await sillyNodePromiseCacheWrapper.getCacheValue(cacheKey);
        });

        it('Then the cached value is returned', () => {
          expect(result).toEqual(cacheValue);
        });
      });
    });
  });
});
