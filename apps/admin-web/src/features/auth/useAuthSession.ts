import { useContext } from "react";

import { AuthSessionContext, type AuthSessionValue } from "./authSessionState";

export function useAuthSession(): AuthSessionValue {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error("AuthSessionProvider is required.");
  }
  return value;
}
