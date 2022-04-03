import AsyncLock = require('async-lock');
import { SillyLockFacilitatorWrapper } from '@silly-suite/silly-lock';

export class SillyAsyncLockFacilitatorWrapper
  implements SillyLockFacilitatorWrapper<string, AsyncLock>
{
  constructor(public readonly underlyingLockFacilitator: AsyncLock) {}

  public executeCriticalSectionWhenLockAcquired<V>(
    lockKey: string,
    executeCriticalSection: () => Promise<V>
  ): Promise<V> {
    return this.underlyingLockFacilitator.acquire(
      lockKey,
      executeCriticalSection
    );
  }
}
