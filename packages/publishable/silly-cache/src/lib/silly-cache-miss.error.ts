export class SillyCacheMissError extends Error {
  constructor(message: string) {
    super(message);
    this.name = SillyCacheMissError.name;
  }
}
