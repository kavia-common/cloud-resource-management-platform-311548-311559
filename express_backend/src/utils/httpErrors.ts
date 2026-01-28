export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// PUBLIC_INTERFACE
export function badRequest(code: string, message: string): HttpError {
  /** Create a 400 error. */
  return new HttpError(400, code, message);
}

// PUBLIC_INTERFACE
export function unauthorized(code: string, message: string): HttpError {
  /** Create a 401 error. */
  return new HttpError(401, code, message);
}

// PUBLIC_INTERFACE
export function forbidden(code: string, message: string): HttpError {
  /** Create a 403 error. */
  return new HttpError(403, code, message);
}

// PUBLIC_INTERFACE
export function notFound(code: string, message: string): HttpError {
  /** Create a 404 error. */
  return new HttpError(404, code, message);
}

// PUBLIC_INTERFACE
export function conflict(code: string, message: string): HttpError {
  /** Create a 409 error. */
  return new HttpError(409, code, message);
}
