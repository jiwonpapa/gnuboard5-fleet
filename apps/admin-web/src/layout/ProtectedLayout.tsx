import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

export function ProtectedLayout(props: {
  authorization: "allowed" | "checking" | "denied";
  children: ReactNode;
}) {
  if (props.authorization === "checking") {
    return <p role="status">세션 확인 중</p>;
  }
  if (props.authorization === "denied") {
    return <Navigate to="/" replace />;
  }
  return props.children;
}
