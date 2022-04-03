export class LockAcquisitionAttemptsExhaustedError extends Error {
  constructor() {
    super('exhausted allowed attempts to acquire dynamo lock');
    this.name = LockAcquisitionAttemptsExhaustedError.name;
  }
}
