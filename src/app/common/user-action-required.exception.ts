export class UserActionRequiredException extends Error {
  constructor(message: string) {
    super(message);
  }
}
