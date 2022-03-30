import NodeCache = require('node-cache');
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

    describe('Given a value is set in silly node cache wrapper', () => {
      const cacheValue = 42;
      const cacheKey = 'foo';
      beforeEach(async () => {
        await sillyNodeCacheWrapper.setCacheValue(cacheKey, cacheValue);
      });

      describe('When cached value is retrieved from silly node cache wrapper', () => {
        let result: number | undefined;
        beforeEach(async () => {
          result = await sillyNodeCacheWrapper.getCacheValue(cacheKey);
        });

        it('Then the cached value is returned', () => {
          expect(result).toEqual(cacheValue);
        });
      });
    });
  });
});
