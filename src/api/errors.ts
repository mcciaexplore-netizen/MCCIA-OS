/** Error types shared across the API + UI layers. */

/** The Sheets backend env vars have not been configured (server returns 501). */
export class NotConfiguredError extends Error {
  constructor(message?: string) {
    super(
      message ??
        'The Google Sheets backend is not configured. Add your credentials to .env.local (see .env.example).'
    );
    this.name = 'NotConfiguredError';
  }
}

/** A non-success response (or network failure) from the Sheets proxy. */
export class SheetsApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'SheetsApiError';
    this.status = status;
  }
}
