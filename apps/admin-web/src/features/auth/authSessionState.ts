import { createContext } from "react";

import type { FleetSession } from "../../api/fleet";

export interface AuthSessionValue {
  idleTimeoutMinutes: number;
  logout: () => Promise<void>;
  session: FleetSession;
  updateIdleTimeout: (minutes: number) => void;
  updateSession: (session: FleetSession) => void;
}

export const AuthSessionContext = createContext<AuthSessionValue | null>(null);
