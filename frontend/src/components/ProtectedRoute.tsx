import React from 'react';
import { Navigate } from 'react-router-dom';
const ProtectedRoute = ({ user, adminOnly, children }: any) => {
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.username !== 'Mohan') return <Navigate to="/" />;
  return children;
};
export default ProtectedRoute;
