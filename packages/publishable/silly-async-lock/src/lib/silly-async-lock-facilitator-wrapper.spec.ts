import AsyncLock = require('async-lock');
import { SillyAsyncLockFacilitatorWrapper } from './silly-async-lock-facilitator-wrapper';

describe('Given an async lock', () => {
  let asyncLockAcquireSpy: jest.SpyInstance;
  let asyncLock: AsyncLock;
  beforeEach(() => {
    asyncLock = new AsyncLock();
    asyncLockAcquireSpy = jest.spyOn(asyncLock, 'acquire');
  });

  describe('Given a silly async lock facilitator wrapper', () => {
    let sillyAsyncLockFacilitatorWrapper: SillyAsyncLockFacilitatorWrapper;
    beforeEach(() => {
      sillyAsyncLockFacilitatorWrapper = new SillyAsyncLockFacilitatorWrapper(
        asyncLock
      );
    });

    describe('When getting underlying lock facilitator', () => {
      let underlyingFacilitator: AsyncLock;
      beforeEach(() => {
        underlyingFacilitator =
          sillyAsyncLockFacilitatorWrapper.underlyingLockFacilitator;
      });

      it('Then underlying facilitator can be retrieved', () => {
        expect(underlyingFacilitator).toBe(asyncLock);
      });
    });

    describe('When executing critical section when lock acquired', () => {
      const lockKey = 'foo';
      let result: number;
      let executeCriticalSection: () => Promise<number>;
      beforeEach(async () => {
        executeCriticalSection = () => Promise.resolve(42);
        result =
          await sillyAsyncLockFacilitatorWrapper.executeCriticalSectionWhenLockAcquired(
            lockKey,
            executeCriticalSection
          );
      });

      it('Then underlying async lock object is used', () => {
        expect(asyncLockAcquireSpy).toHaveBeenCalledWith(
          lockKey,
          executeCriticalSection
        );
      });

      it('Then same result from underlying async lock is returned', () => {
        expect(result).toEqual(42);
      });
    });
  });
});
