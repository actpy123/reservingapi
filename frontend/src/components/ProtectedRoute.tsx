import { type ComponentType } from "react";
import { Navigate } from "react-router-dom";

type ProtectedRouteProps<P extends object> = {
  component: ComponentType<P>;
  isAuthenticated: boolean;
} & P;

function ProtectedRoute<P extends object>({
  component: Component,
  isAuthenticated,
  ...rest
}: ProtectedRouteProps<P>) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Component {...(rest as P)} />;
}

export default ProtectedRoute;
