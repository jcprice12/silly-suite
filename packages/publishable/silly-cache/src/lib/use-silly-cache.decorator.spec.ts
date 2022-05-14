import { Observable, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  SillyCache,
  SillyObservableCache,
  SillyPromiseCache,
} from './silly-cache';
import { SillyCacheMissError } from './silly-cache-miss.error';
import {
  UseSillyCacheForObservable,
  UseSillyCacheForPromise,
} from './use-silly-cache.decorator';

const cacheKey = 'foo';
const originalMethodReturnValue = 42;

class FakeSillyCache implements SillyCache<string> {
  private readonly data = new Map<string, unknown>();
  public getCacheValue<T>(cacheKey: string): T {
    const val = this.data.get(cacheKey) as T;
    if (val !== undefined) {
      return val;
    }
    throw new SillyCacheMissError('cache miss');
  }
  public setCacheValue<T>(cacheKey: string, cacheValue: T): void {
    this.data.set(cacheKey, cacheValue);
  }
}

class FakeSillyPromiseCache implements SillyPromiseCache<string> {
  constructor(private readonly cache: FakeSillyCache) {}
  public getCacheValue<T>(cacheKey: string): Promise<T> {
    try {
      return Promise.resolve(this.cache.getCacheValue(cacheKey));
    } catch (e) {
      return Promise.reject(e);
    }
  }
  public async setCacheValue<T>(
    cacheKey: string,
    cacheValue: T
  ): Promise<void> {
    this.cache.setCacheValue(cacheKey, cacheValue);
  }
}

class FakeSillyObservableCache implements SillyObservableCache<string> {
  constructor(private readonly cache: FakeSillyCache) {}
  public getCacheValue<T>(cacheKey: string): Observable<T> {
    try {
      return of(this.cache.getCacheValue(cacheKey));
    } catch (e) {
      return throwError(e);
    }
  }
  public setCacheValue<T>(cacheKey: string, cacheValue: T): Observable<void> {
    return of(void undefined).pipe(
      tap(() => {
        this.cache.setCacheValue(cacheKey, cacheValue);
      })
    );
  }
}

let underlyingCache: FakeSillyCache;
function makeFakeSillyCache() {
  underlyingCache = new FakeSillyCache();
  return underlyingCache;
}
describe.each`
  cacheImpl                                                | cacheName
  ${makeFakeSillyCache}                                    | ${'FakeSillyCache'}
  ${() => new FakeSillyPromiseCache(makeFakeSillyCache())} | ${'FakeSillyPromiseCache'}
`(
  'Given implementation of silly cache for promises: $cacheName',
  ({ cacheImpl }) => {
    let cache: SillyPromiseCache<string> | SillyCache<string>;
    beforeEach(() => {
      cache = cacheImpl();
    });

    describe(`Given a decorated method in which the original implementation will yield "${originalMethodReturnValue}"`, () => {
      class ClassUnderTest {
        constructor(
          private readonly cache: SillyPromiseCache<string> | SillyCache<string>
        ) {}

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

        it('Then original method return value is cached', () => {
          const cachedVal = underlyingCache.getCacheValue(cacheKey);
          expect(cachedVal).toEqual(originalMethodReturnValue);
        });
      });

      describe('Given there will be an issue caching value', () => {
        beforeEach(() => {
          jest
            .spyOn(underlyingCache, 'setCacheValue')
            .mockImplementation(() => {
              throw new Error('err');
            });
        });

        describe('When decorated method is executed', () => {
          let result: unknown;
          beforeEach(async () => {
            result = await classUnderTest.expensiveOperation(cacheKey);
          });

          it('Then original method return value is yielded', () => {
            expect(result).toEqual(originalMethodReturnValue);
          });

          it('Then original method return value is not cached', () => {
            try {
              underlyingCache.getCacheValue(cacheKey);
              fail('a cache miss error should have been thrown');
            } catch (e) {
              expect(e).toBeInstanceOf(SillyCacheMissError);
            }
          });
        });
      });

      describe('Given value exists in the cache', () => {
        const cacheValue = 43;
        beforeEach(() => {
          underlyingCache.setCacheValue(cacheKey, cacheValue);
        });

        describe('When decorated method is invoked', () => {
          let result: unknown;
          beforeEach(async () => {
            result = await classUnderTest.expensiveOperation(cacheKey);
          });

          it(`Then cached value is returned`, () => {
            expect(result).toEqual(cacheValue);
          });

          it(`Then cached value exists in cache`, () => {
            const cachedVal = underlyingCache.getCacheValue(cacheKey);
            expect(cachedVal).toEqual(cacheValue);
          });
        });
      });
    });
  }
);

describe.each`
  cacheImpl                                                   | cacheName
  ${makeFakeSillyCache}                                       | ${'FakeSillyCache'}
  ${() => new FakeSillyObservableCache(makeFakeSillyCache())} | ${'FakeSillyObservableCache'}
`(
  'Given implementation of silly cache for observable: $cacheName',
  ({ cacheImpl }) => {
    let cache: SillyObservableCache<string> | SillyCache<string>;
    beforeEach(() => {
      cache = cacheImpl();
    });

    describe(`Given a decorated method in which the original implementation will yield "${originalMethodReturnValue}"`, () => {
      class ClassUnderTest {
        constructor(
          private readonly cache:
            | SillyObservableCache<string>
            | SillyCache<string>
        ) {}

        private readonly data: Map<string, unknown> = new Map([
          [cacheKey, originalMethodReturnValue],
        ]);

        @UseSillyCacheForObservable(
          (data: { thiz: ClassUnderTest }) => data.thiz.cache,
          (data: { args: [string] }) => data.args[0]
        )
        public expensiveOperation(arg: string): Observable<unknown> {
          return of(this.data.get(arg));
        }
      }

      let classUnderTest: ClassUnderTest;

      beforeEach(() => {
        classUnderTest = new ClassUnderTest(cache);
      });

      describe('When decorated method is executed without a currently cached value', () => {
        let result: Observable<unknown>;
        beforeEach(() => {
          result = classUnderTest.expensiveOperation(cacheKey);
        });

        it('Then original method return value is yielded', (done) => {
          result.subscribe((val) => {
            expect(val).toEqual(originalMethodReturnValue);
            done();
          });
        });

        it('Then original method return value is cached', (done) => {
          result.subscribe(() => {
            const cachedVal = underlyingCache.getCacheValue(cacheKey);
            expect(cachedVal).toEqual(originalMethodReturnValue);
            done();
          });
        });
      });

      describe('Given there will be an issue caching value', () => {
        beforeEach(() => {
          jest
            .spyOn(underlyingCache, 'setCacheValue')
            .mockImplementation(() => {
              throw new Error('err');
            });
        });

        describe('When decorated method is executed', () => {
          let result: Observable<unknown>;
          beforeEach(() => {
            result = classUnderTest.expensiveOperation(cacheKey);
          });

          it('Then original method return value is yielded', (done) => {
            result.subscribe((val) => {
              expect(val).toEqual(originalMethodReturnValue);
              done();
            });
          });

          it('Then original method return value is not cached', (done) => {
            result.subscribe(() => {
              try {
                underlyingCache.getCacheValue(cacheKey);
                fail('a cache miss error should have been thrown');
              } catch (e) {
                expect(e).toBeInstanceOf(SillyCacheMissError);
                done();
              }
              fail('a cache miss error should have been thrown');
            });
          });
        });
      });

      describe('Given value exists in the cache', () => {
        const cacheValue = 43;
        beforeEach(() => {
          underlyingCache.setCacheValue(cacheKey, cacheValue);
        });

        describe('When decorated method is invoked', () => {
          let result: Observable<unknown>;
          beforeEach(() => {
            result = classUnderTest.expensiveOperation(cacheKey);
          });

          it(`Then cached value is returned`, (done) => {
            result.subscribe((val) => {
              expect(val).toEqual(cacheValue);
              done();
            });
          });

          it(`Then cached value exists in cache`, (done) => {
            result.subscribe(() => {
              const cachedVal = underlyingCache.getCacheValue(cacheKey);
              expect(cachedVal).toEqual(cacheValue);
              done();
            });
          });
        });
      });
    });
  }
);
