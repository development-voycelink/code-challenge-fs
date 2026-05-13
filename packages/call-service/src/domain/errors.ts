export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class InvalidTransitionError extends Error {
  readonly statusCode = 422;
  constructor(message: string) {
    super(message);
    this.name = "InvalidTransitionError";
  }
}
