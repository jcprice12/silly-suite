import { sleep } from './silly-sleep';

describe('Given a time to sleep in milliseconds', () => {
  const timeToSleep = 500;
  describe('When told to sleep', () => {
    let startTime: number;
    let endTime: number;
    beforeEach(async () => {
      startTime = Date.now();
      await sleep(timeToSleep);
      endTime = Date.now();
    });
    it('Then process sleeps for the duration of time specified', () => {
      expect(endTime - startTime).toBeGreaterThanOrEqual(timeToSleep);
    });
  });
});
