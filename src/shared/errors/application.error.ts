export type ApplicationErrorDetails = Readonly<Record<string, unknown>>;

export abstract class ApplicationError extends Error {
  protected constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: ApplicationErrorDetails,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}
