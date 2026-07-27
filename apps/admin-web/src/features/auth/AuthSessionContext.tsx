import type { ReactNode } from "react";

import { AuthSessionContext, type AuthSessionValue } from "./authSessionState";
export function AuthSessionProvider(props: {
  children: ReactNode;
  value: AuthSessionValue;
}) {
  return (
    <AuthSessionContext.Provider value={props.value}>
      {props.children}
    </AuthSessionContext.Provider>
  );
}
