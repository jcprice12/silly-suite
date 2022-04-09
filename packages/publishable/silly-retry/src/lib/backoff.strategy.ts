export interface BackoffStrategy {
  getNextBackoffAmount(attemptsAlreadyMade: number): number;
}

export class FixedBackoffStrategy implements BackoffStrategy {
  constructor(private readonly timeToWaitBetweenAttempts: number) {}

  getNextBackoffAmount(): number {
    return this.timeToWaitBetweenAttempts;
  }
}

export class LinearBackoffStrategy implements BackoffStrategy {
  constructor(private readonly timeToAddBetweenEachAttempt: number) {}

  getNextBackoffAmount(attemptsAlreadyMade: number): number {
    return this.timeToAddBetweenEachAttempt * attemptsAlreadyMade;
  }
}

export class ExponentialBackoffStrategy implements BackoffStrategy {
  constructor(
    private readonly multiplier: number,
    private readonly base: number
  ) {}

  getNextBackoffAmount(attemptsAlreadyMade: number): number {
    return attemptsAlreadyMade > 0
      ? Math.pow(this.base, attemptsAlreadyMade) * this.multiplier
      : 0;
  }
}
