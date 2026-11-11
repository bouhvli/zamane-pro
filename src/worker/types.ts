import type { Slot } from "../shared/enums.ts";
import type { Auth } from "./auth.ts";
import type { AppConfig } from "./env.ts";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface SpaceContext {
  spaceId: string;
  userId: string;
  slot: Slot;
  currency: string;
  timezone: string;
}

export interface AppEnv {
  Bindings: Env;
  Variables: {
    requestId: string;
    config: AppConfig;
    auth: Auth;
    user: SessionUser;
    sessionId: string;
    space: SpaceContext;
  };
}
