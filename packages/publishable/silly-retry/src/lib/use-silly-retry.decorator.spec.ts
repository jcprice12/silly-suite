import { Observable } from 'rxjs';
import { BackoffStrategy } from './backoff.strategy';
import { RetryCondition } from './retry.condition';
import { UseSillyRetry } from './use-silly-retry.decorator';

interface ArbitraryArg {
  foo: string;
}
interface ArbitraryResult {
  bar: string;
}
let arbitraryError: Error;
let arbitraryArg: ArbitraryArg;
let arbitraryResult: ArbitraryResult;
let testMock: jest.Mock;

function assertMethodCalledCorrectly(times: number, arg: ArbitraryArg): void {
  expect(testMock).toHaveBeenCalledTimes(times);
  for (let i = 0; i < times; i++) {
    expect(testMock).toHaveBeenNthCalledWith(i + 1, arg);
  }
}

describe('Given some arbitrary args, errors, and results', () => {
  beforeEach(() => {
    testMock = jest.fn();
    arbitraryError = new Error('errr');
    arbitraryArg = {
      foo: 'hello',
    };
    arbitraryResult = {
      bar: 'hi',
    };
  });

  describe('Given a class with a method to retry that does not return either a promise or an observable', () => {
    class TestClass {
      @UseSillyRetry()
      test(arg1: ArbitraryArg): ArbitraryResult {
        return testMock(arg1);
      }
    }

    let testable: TestClass;
    beforeEach(() => {
      testable = new TestClass();
    });

    describe('Given decorated method will not fail', () => {
      beforeEach(() => {
        testMock.mockReturnValue(arbitraryResult);
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let result: ArbitraryResult;
        beforeEach(() => {
          result = testable.test(arbitraryArg);
        });

        test('Then result is successfully returned', () => {
          expect(result).toBe(arbitraryResult);
        });

        test('Then the original method is only called once with the original arguments', () => {
          assertMethodCalledCorrectly(1, arbitraryArg);
        });
      });
    });

    describe('Given decorated method will always fail', () => {
      beforeEach(() => {
        testMock.mockImplementation(() => {
          throw arbitraryError;
        });
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let thrownError: unknown;
        let startTime: number;
        let totalTime: number;
        beforeEach(() => {
          try {
            startTime = Date.now();
            testable.test(arbitraryArg);
            fail('an error should have been thrown but was not');
          } catch (e) {
            totalTime = Date.now() - startTime;
            thrownError = e;
          }
        });

        test('Then last error thrown by original method is thrown', () => {
          expect(thrownError).toBe(arbitraryError);
        });

        test('Then the original method is NOT retried', () => {
          assertMethodCalledCorrectly(1, arbitraryArg);
        });

        test('Then there is no noticeable delay', () => {
          expect(totalTime).toBeLessThanOrEqual(50);
        });
      });
    });
  });

  describe('Given a class with a method to retry (no options specified) that returns a promise', () => {
    class TestClass {
      @UseSillyRetry()
      test(arg1: ArbitraryArg): Promise<ArbitraryResult> {
        return testMock(arg1);
      }
    }

    let testable: TestClass;
    beforeEach(() => {
      testable = new TestClass();
    });

    describe('Given decorated method will not fail', () => {
      beforeEach(() => {
        testMock.mockResolvedValue(arbitraryResult);
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let result: ArbitraryResult;
        beforeEach(async () => {
          result = await testable.test(arbitraryArg);
        });

        test('Then result is successfully returned', () => {
          expect(result).toBe(arbitraryResult);
        });

        test('Then the original method is only called once with the original arguments', () => {
          assertMethodCalledCorrectly(1, arbitraryArg);
        });
      });
    });

    describe('Given decorated method will always fail', () => {
      beforeEach(() => {
        testMock.mockRejectedValue(arbitraryError);
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let thrownError: unknown;
        let startTime: number;
        let totalTime: number;
        beforeEach(async () => {
          try {
            startTime = Date.now();
            await testable.test(arbitraryArg);
            fail('an error should have been thrown but was not');
          } catch (e) {
            totalTime = Date.now() - startTime;
            thrownError = e;
          }
        });

        test('Then last error thrown by original method is thrown', () => {
          expect(thrownError).toBe(arbitraryError);
        });

        test('Then the original method is retried the default number of times', () => {
          assertMethodCalledCorrectly(3, arbitraryArg);
        });

        test('Then there is no noticeable delay', () => {
          expect(totalTime).toBeLessThanOrEqual(50);
        });
      });
    });

    describe('Given decorated method will eventually succeed', () => {
      beforeEach(() => {
        testMock
          .mockRejectedValueOnce(arbitraryError)
          .mockResolvedValue(arbitraryResult);
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let result: ArbitraryResult;
        beforeEach(async () => {
          result = await testable.test(arbitraryArg);
        });

        test('Then result is successfully returned', () => {
          expect(result).toBe(arbitraryResult);
        });

        test('Then the original method is called the correct number of times', () => {
          assertMethodCalledCorrectly(2, arbitraryArg);
        });
      });
    });
  });

  describe('Given a class with a method to retry a specified number of times that returns a promise', () => {
    class TestClass {
      @UseSillyRetry({ retryAttempts: 3 })
      test(arg1: ArbitraryArg): Promise<ArbitraryResult> {
        return testMock(arg1);
      }
    }

    let testable: TestClass;
    beforeEach(() => {
      testable = new TestClass();
    });

    describe('Given decorated method will always fail', () => {
      beforeEach(() => {
        testMock.mockRejectedValue(arbitraryError);
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let thrownError: unknown;
        beforeEach(async () => {
          try {
            await testable.test(arbitraryArg);
            fail('an error should have been thrown but was not');
          } catch (e) {
            thrownError = e;
          }
        });

        test('Then last error thrown by original method is thrown', () => {
          expect(thrownError).toBe(arbitraryError);
        });

        test('Then the original method is retried the correct number of times', () => {
          assertMethodCalledCorrectly(4, arbitraryArg);
        });
      });
    });
  });

  describe('Given a class with a method to retry with a backoff strategy that returns a promise', () => {
    const smallAmountOfTime = 200;
    class TestBackoffStrategy implements BackoffStrategy {
      getNextBackoffAmount(): number {
        return smallAmountOfTime;
      }
    }
    class TestClass {
      @UseSillyRetry({ backoffStrategy: new TestBackoffStrategy() })
      test(arg1: ArbitraryArg): Promise<ArbitraryResult> {
        return testMock(arg1);
      }
    }

    let testable: TestClass;
    beforeEach(() => {
      testable = new TestClass();
    });

    describe('Given decorated method will always fail', () => {
      beforeEach(() => {
        testMock.mockRejectedValue(arbitraryError);
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let thrownError: unknown;
        let totalTime: number;
        beforeEach(async () => {
          const startTime = Date.now();
          try {
            await testable.test(arbitraryArg);
            fail('an error should have been thrown but was not');
          } catch (e) {
            thrownError = e;
            totalTime = Date.now() - startTime;
          }
        });

        test('Then last error thrown by original method is thrown', () => {
          expect(thrownError).toBe(arbitraryError);
        });

        test('Then the original method is retried the correct number of times', () => {
          assertMethodCalledCorrectly(3, arbitraryArg);
        });

        test('Then there is a delay between each method call as specified by the backoff policy', () => {
          expect(totalTime).toBeGreaterThanOrEqual(smallAmountOfTime * 2);
        });
      });
    });
  });

  describe('Given a class with a method to retry with a specified retry condition that returns a promise', () => {
    class TestRetryCondition implements RetryCondition<Error> {
      shouldRetry(e: Error): boolean {
        return e === arbitraryError;
      }
    }
    class TestClass {
      @UseSillyRetry({ retryCondition: new TestRetryCondition() })
      test(arg1: ArbitraryArg): Promise<ArbitraryResult> {
        return testMock(arg1);
      }
    }

    let testable: TestClass;
    beforeEach(() => {
      testable = new TestClass();
    });

    describe('Given decorated method will always fail with error that passes retry condition', () => {
      beforeEach(() => {
        testMock.mockRejectedValue(arbitraryError);
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let thrownError: unknown;
        beforeEach(async () => {
          try {
            await testable.test(arbitraryArg);
            fail('an error should have been thrown but was not');
          } catch (e) {
            thrownError = e;
          }
        });

        test('Then last error thrown by original method is thrown', () => {
          expect(thrownError).toBe(arbitraryError);
        });

        test('Then the original method is retried the correct number of times', () => {
          assertMethodCalledCorrectly(3, arbitraryArg);
        });
      });
    });

    describe('Given decorated method will fail with error that passes retry condition but then fails with error that does not pass retry condition', () => {
      let errorThatDoesNotPassCondition: Error;
      beforeEach(() => {
        errorThatDoesNotPassCondition = new Error('ouch');
        testMock
          .mockRejectedValueOnce(arbitraryError)
          .mockRejectedValue(errorThatDoesNotPassCondition);
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let thrownError: unknown;
        beforeEach(async () => {
          try {
            await testable.test(arbitraryArg);
            fail('an error should have been thrown but was not');
          } catch (e) {
            thrownError = e;
          }
        });

        test('Then last error thrown by original method is thrown', () => {
          expect(thrownError).toBe(errorThatDoesNotPassCondition);
        });

        test('Then the original method is retried the correct number of times', () => {
          assertMethodCalledCorrectly(2, arbitraryArg);
        });
      });
    });
  });

  describe('Given a class with a method to retry that returns an observable (no options specified)', () => {
    class TestClass {
      @UseSillyRetry()
      test(arg1: ArbitraryArg): Observable<ArbitraryResult> {
        return new Observable((subscriber) => {
          const val = testMock(arg1);
          try {
            subscriber.next(val);
            subscriber.complete();
          } catch (e) {
            subscriber.error(e);
          }
        });
      }
    }

    let testable: TestClass;
    beforeEach(() => {
      testable = new TestClass();
    });

    describe('Given decorated method will not fail', () => {
      beforeEach(() => {
        testMock.mockReturnValue(arbitraryResult);
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let result: ArbitraryResult;
        beforeEach(async () => {
          result = await testable.test(arbitraryArg).toPromise();
        });

        test('Then result is successfully returned', () => {
          expect(result).toBe(arbitraryResult);
        });

        test('Then the original method is only called once with the original arguments', () => {
          assertMethodCalledCorrectly(1, arbitraryArg);
        });
      });
    });

    describe('Given decorated method will always fail', () => {
      beforeEach(() => {
        testMock.mockImplementation(() => {
          throw arbitraryError;
        });
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let thrownError: unknown;
        let startTime: number;
        let totalTime: number;
        beforeEach(async () => {
          try {
            startTime = Date.now();
            await testable.test(arbitraryArg).toPromise();
            fail('an error should have been thrown but was not');
          } catch (e) {
            totalTime = Date.now() - startTime;
            thrownError = e;
          }
        });

        test('Then last error thrown by original method is thrown', () => {
          expect(thrownError).toBe(arbitraryError);
        });

        test('Then the original method is retried the default number of times', () => {
          assertMethodCalledCorrectly(3, arbitraryArg);
        });

        test('Then there is no noticeable delay', () => {
          expect(totalTime).toBeLessThanOrEqual(50);
        });
      });
    });

    describe('Given decorated method will eventually succeed', () => {
      beforeEach(() => {
        testMock
          .mockImplementationOnce(() => {
            throw arbitraryError;
          })
          .mockReturnValue(arbitraryResult);
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let result: ArbitraryResult;
        beforeEach(async () => {
          result = await testable.test(arbitraryArg).toPromise();
        });

        test('Then result is successfully returned', () => {
          expect(result).toBe(arbitraryResult);
        });

        test('Then the original method is called the correct number of times', () => {
          assertMethodCalledCorrectly(2, arbitraryArg);
        });
      });
    });
  });

  describe('Given a class with a method to retry a specified number of times that returns an observable', () => {
    class TestClass {
      @UseSillyRetry({ retryAttempts: 3 })
      test(arg1: ArbitraryArg): Observable<ArbitraryResult> {
        return new Observable((subscriber) => {
          try {
            const val = testMock(arg1);
            subscriber.next(val);
            subscriber.complete();
          } catch (e) {
            subscriber.error(e);
          }
        });
      }
    }

    let testable: TestClass;
    beforeEach(() => {
      testable = new TestClass();
    });

    describe('Given decorated method will always fail', () => {
      beforeEach(() => {
        testMock.mockImplementation(() => {
          throw arbitraryError;
        });
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let thrownError: unknown;
        beforeEach(async () => {
          try {
            await testable.test(arbitraryArg).toPromise();
            fail('an error should have been thrown but was not');
          } catch (e) {
            thrownError = e;
          }
        });

        test('Then last error thrown by original method is thrown', () => {
          expect(thrownError).toBe(arbitraryError);
        });

        test('Then the original method is retried the correct number of times', () => {
          assertMethodCalledCorrectly(4, arbitraryArg);
        });
      });
    });
  });

  describe('Given a class with a method to retry with a backoff strategy that returns an observable', () => {
    const smallAmountOfTime = 200;
    class TestBackoffStrategy implements BackoffStrategy {
      getNextBackoffAmount(): number {
        return smallAmountOfTime;
      }
    }
    class TestClass {
      @UseSillyRetry({ backoffStrategy: new TestBackoffStrategy() })
      test(arg1: ArbitraryArg): Observable<ArbitraryResult> {
        return new Observable((subscriber) => {
          try {
            const val = testMock(arg1);
            subscriber.next(val);
            subscriber.complete();
          } catch (e) {
            subscriber.error(e);
          }
        });
      }
    }

    let testable: TestClass;
    beforeEach(() => {
      testable = new TestClass();
    });

    describe('Given decorated method will always fail', () => {
      beforeEach(() => {
        testMock.mockImplementation(() => {
          throw arbitraryError;
        });
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let thrownError: unknown;
        let totalTime: number;
        beforeEach(async () => {
          const startTime = Date.now();
          try {
            await testable.test(arbitraryArg).toPromise();
            fail('an error should have been thrown but was not');
          } catch (e) {
            totalTime = Date.now() - startTime;
            thrownError = e;
          }
        });

        test('Then last error thrown by original method is thrown', () => {
          expect(thrownError).toBe(arbitraryError);
        });

        test('Then the original method is retried the correct number of times', () => {
          assertMethodCalledCorrectly(3, arbitraryArg);
        });

        test('Then there is a delay between each method call as specified by the backoff policy', () => {
          expect(totalTime).toBeGreaterThanOrEqual(smallAmountOfTime * 2);
        });
      });
    });
  });

  describe('Given a class with a method to retry with a specified retry condition that returns an observable', () => {
    class TestRetryCondition implements RetryCondition<Error> {
      shouldRetry(e: Error): boolean {
        return e === arbitraryError;
      }
    }
    class TestClass {
      @UseSillyRetry({ retryCondition: new TestRetryCondition() })
      test(arg1: ArbitraryArg): Observable<ArbitraryResult> {
        return new Observable((subscriber) => {
          try {
            const val = testMock(arg1);
            subscriber.next(val);
            subscriber.complete();
          } catch (e) {
            subscriber.error(e);
          }
        });
      }
    }

    let testable: TestClass;
    beforeEach(() => {
      testable = new TestClass();
    });

    describe('Given decorated method will always fail with error that passes retry condition', () => {
      beforeEach(() => {
        testMock.mockImplementation(() => {
          throw arbitraryError;
        });
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let thrownError: unknown;
        beforeEach(async () => {
          try {
            await testable.test(arbitraryArg).toPromise();
            fail('an error should have been thrown but was not');
          } catch (e) {
            thrownError = e;
          }
        });

        test('Then last error thrown by original method is thrown', () => {
          expect(thrownError).toBe(arbitraryError);
        });

        test('Then the original method is retried the correct number of times', () => {
          assertMethodCalledCorrectly(3, arbitraryArg);
        });
      });
    });

    describe('Given decorated method will fail with error that passes retry condition but then fails with error that does not pass retry condition', () => {
      let errorThatDoesNotPassCondition: Error;
      beforeEach(() => {
        errorThatDoesNotPassCondition = new Error('ouch');
        testMock
          .mockImplementationOnce(() => {
            throw arbitraryError;
          })
          .mockImplementation(() => {
            throw errorThatDoesNotPassCondition;
          });
      });

      describe('When method is invoked with arbitrary arguments', () => {
        let thrownError: unknown;
        beforeEach(async () => {
          try {
            await testable.test(arbitraryArg).toPromise();
            fail('an error should have been thrown but was not');
          } catch (e) {
            thrownError = e;
          }
        });

        test('Then last error thrown by original method is thrown', () => {
          expect(thrownError).toBe(errorThatDoesNotPassCondition);
        });

        test('Then the original method is retried the correct number of times', () => {
          assertMethodCalledCorrectly(2, arbitraryArg);
        });
      });
    });
  });
});
