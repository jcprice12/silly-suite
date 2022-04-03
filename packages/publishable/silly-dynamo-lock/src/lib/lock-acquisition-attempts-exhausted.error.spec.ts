import { LockAcquisitionAttemptsExhaustedError } from './lock-acquisition-attempts-exhausted.error';

describe('When error created', () => {
  let error: LockAcquisitionAttemptsExhaustedError;
  beforeEach(() => {
    error = new LockAcquisitionAttemptsExhaustedError();
  });

  it('Then error has correct name', () => {
    expect(error.name).toEqual('LockAcquisitionAttemptsExhaustedError');
  });

  it('Then error message is correct', () => {
    expect(error.message).toEqual(
      'exhausted allowed attempts to acquire dynamo lock'
    );
  });

  it('Then instanceof works', () => {
    expect(error instanceof LockAcquisitionAttemptsExhaustedError).toBe(true);
  });
});
