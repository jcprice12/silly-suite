import { SillyPromiseCache } from './silly-cache';
import { SillyCacheMissError } from './silly-cache-miss.error';
import { UseSillyCacheForPromise } from './use-silly-cache.decorator';

const cacheKey = 'foo';
const originalMethodReturnValue = 42;

class FakeSillyCache implements SillyPromiseCache<string> {
  private readonly data = new Map<string, unknown>();
  public getCacheValue<T>(cacheKey: string): Promise<T> {
    const val = this.data.get(cacheKey) as T;
    if (val !== undefined) {
      return Promise.resolve(val);
    }
    return Promise.reject(new SillyCacheMissError('cache miss'));
  }
  public async setCacheValue<T>(
    cacheKey: string,
    cacheValue: T
  ): Promise<void> {
    this.data.set(cacheKey, cacheValue);
  }
}

describe('Given implementation of silly promise cache', () => {
  let cache: SillyPromiseCache<string>;
  beforeEach(() => {
    cache = new FakeSillyCache();
  });

  describe(`Given a decorated method in which the original implementation will yield "${originalMethodReturnValue}"`, () => {
    class ClassUnderTest {
      constructor(private readonly cache: SillyPromiseCache<string>) {}

      private readonly data: Map<string, unknown> = new Map([
        [cacheKey, originalMethodReturnValue],
      ]);

      @UseSillyCacheForPromise(
        (data: { thiz: ClassUnderTest }) => data.thiz.cache,
        (data: { args: [string] }) => data.args[0]
      )
      public expensiveOperation(arg: string): Promise<unknown> {
        return Promise.resolve(this.data.get(arg));
      }
    }

    let classUnderTest: ClassUnderTest;

    beforeEach(() => {
      classUnderTest = new ClassUnderTest(cache);
    });

    describe('When decorated method is executed without a currently cached value', () => {
      let result: unknown;
      beforeEach(async () => {
        result = await classUnderTest.expensiveOperation(cacheKey);
      });

      it('Then original method return value is yielded', () => {
        expect(result).toEqual(originalMethodReturnValue);
      });

      it('Then original method return value is cached', async () => {
        const cachedVal = await cache.getCacheValue(cacheKey);
        expect(cachedVal).toEqual(originalMethodReturnValue);
      });
    });

    describe('Given there will be an issue caching value', () => {
      beforeEach(() => {
        jest
          .spyOn(cache, 'setCacheValue')
          .mockRejectedValueOnce(new Error('err'));
      });

      describe('When decorated method is executed without a currently cached value', () => {
        let result: unknown;
        beforeEach(async () => {
          result = await classUnderTest.expensiveOperation(cacheKey);
        });

        it('Then original method return value is yielded', () => {
          expect(result).toEqual(originalMethodReturnValue);
        });

        it('Then original method return value is not cached', async () => {
          try {
            await cache.getCacheValue(cacheKey);
            fail('a cache miss error should have been thrown');
          } catch (e) {
            expect(e).toBeInstanceOf(SillyCacheMissError);
          }
        });
      });
    });

    describe('Given value exists in the cache', () => {
      const cacheValue = 43;
      beforeEach(async () => {
        await cache.setCacheValue(cacheKey, cacheValue);
      });

      describe('When decorated method is invoked', () => {
        let result: unknown;
        beforeEach(async () => {
          result = await classUnderTest.expensiveOperation(cacheKey);
        });

        it(`Then cached value is returned`, () => {
          expect(result).toEqual(cacheValue);
        });

        it(`Then cached value exists in cache`, async () => {
          const cachedVal = await cache.getCacheValue(cacheKey);
          expect(cachedVal).toEqual(cacheValue);
        });
      });
    });
  });
});
