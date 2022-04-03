export interface SillyLockFacilitator<K> {
  executeCriticalSectionWhenLockAcquired<V>(
    lockKey: K,
    executeCriticalSection: () => Promise<V>
  ): Promise<V>;
}

export interface SillyLockFacilitatorWrapper<K, U>
  extends SillyLockFacilitator<K> {
  underlyingLockFacilitator: U;
}
