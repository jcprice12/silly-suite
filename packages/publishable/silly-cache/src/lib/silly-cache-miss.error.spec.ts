import { SillyCacheMissError } from './silly-cache-miss.error';

describe('Given error message', () => {
  const errorMessage = 'I am error';
  describe('When cache miss error is created', () => {
    let error: SillyCacheMissError;
    beforeEach(() => {
      error = new SillyCacheMissError(errorMessage);
    });

    it('Then instanceof works', () => {
      expect(error instanceof SillyCacheMissError).toBe(true);
    });

    it('Then error name is correct', () => {
      expect(error.name).toEqual('SillyCacheMissError');
    });

    it('Then error message is correct', () => {
      expect(error.message).toEqual(errorMessage);
    });
  });
});
