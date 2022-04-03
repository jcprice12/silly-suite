import AsyncLock = require('async-lock');
import { SillyLockFacilitator } from './silly-lock-facilitator';
import { UseSillyLockForPromise } from './use-silly-lock-facilitator.decorator';

const foo = 'foo';

class SillyAsyncLockFacilitator implements SillyLockFacilitator<string> {
  constructor(private readonly asyncLock: AsyncLock) {}
  public executeCriticalSectionWhenLockAcquired<V>(
    lockKey: string,
    executeCriticalSection: () => Promise<V>
  ): Promise<V> {
    return this.asyncLock.acquire(lockKey, executeCriticalSection);
  }
}
const makeSillyAsyncLockFacilitator = () =>
  new SillyAsyncLockFacilitator(new AsyncLock());

describe.each`
  sillyLockName     | makeSillyLock
  ${AsyncLock.name} | ${makeSillyAsyncLockFacilitator}
`('Given implementation of silly lock: $sillyLockName', ({ makeSillyLock }) => {
  let lock: SillyLockFacilitator<string>;
  beforeEach(() => {
    lock = makeSillyLock();
  });

  describe('Given a decorated method', () => {
    class ClassUnderTest {
      constructor(private readonly lock: SillyLockFacilitator<string>) {}

      @UseSillyLockForPromise(
        (data: { thiz: ClassUnderTest }) => data.thiz.lock,
        (data: { args: [string] }) => data.args[0]
      )
      public criticalOperation(arg: string): Promise<string> {
        return Promise.resolve(arg);
      }
    }

    let classUnderTest: ClassUnderTest;

    beforeEach(() => {
      classUnderTest = new ClassUnderTest(lock);
    });

    describe('When decorated method is invoked', () => {
      let result: unknown;
      beforeEach(async () => {
        result = await classUnderTest.criticalOperation(foo);
      });

      it('Then original method return value is yielded', () => {
        expect(result).toEqual(foo);
      });
    });
  });
});
