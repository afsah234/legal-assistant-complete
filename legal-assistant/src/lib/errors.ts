// An error whose message is safe to show to the end user.
// Technical details are logged on the server only, never sent to the browser.
export class DraftError extends Error {
  readonly status: number;

  constructor(userMessage: string, status: number) {
    super(userMessage);
    this.name = "DraftError";
    this.status = status;
  }
}
