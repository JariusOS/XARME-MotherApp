export class MineError extends Error {
  constructor(message: string, public code: string, public status = 400) {
    super(message);
  }
}
