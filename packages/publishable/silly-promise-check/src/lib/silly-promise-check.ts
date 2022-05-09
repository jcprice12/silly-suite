export function isPromise<T>(val: unknown): val is Promise<T> {
  if (typeof (val as Promise<T>)?.then === 'function') {
    return true;
  }
  return false;
}
