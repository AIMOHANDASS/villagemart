import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole: string }) => {
  const location = useLocation();
  const token = localStorage.getItem("jwt_token") || localStorage.getItem("jwt_token_admin") || localStorage.getItem("jwt_token_transport") || localStorage.getItem("jwt_token_delivery");
  const cachedUserRaw = localStorage.getItem("user");

  // Parse active parameters from current viewport context
  const currentParams = location.search; 

  if (!token || !cachedUserRaw) {
    // Crucial Fix: Keep query strings active during authentication redirects! 🎯
    return <Navigate to={`/login${currentParams}`} replace state={{ from: location }} />;
  }

  try {
    const user = JSON.parse(cachedUserRaw);
    const userRole = String(user.role).toUpperCase();

    if (userRole !== allowedRole.toUpperCase() && userRole !== "ADMIN") {
      return <Navigate to={`/login${currentParams}`} replace />;
    }
  } catch (err) {
    localStorage.clear();
    return <Navigate to={`/login${currentParams}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
