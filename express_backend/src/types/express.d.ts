import type { AuthContext } from '../utils/authTypes';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
