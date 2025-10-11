// src/AppRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout"; // <-- new page
import AdminPanel from "./pages/AdminPanel";
import TestMap from "./pages/TestMap"; // <-- new page

type Props = {
  user: any;
  onLogin: (u: any) => void;
  onLogout: () => void;
};

const AppRoutes: React.FC<Props> = ({ user, onLogin, onLogout }) => {
  const PrivateRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
    return user ? children : <Navigate to="/login" replace />;
  };

  const AdminRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
    return user?.username === "Mohan" ? children : <Navigate to="/login" replace />;
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home user={user} />} />
      <Route path="/signup" element={<Signup onLogin={onLogin} />} />
      <Route path="/login" element={<Login onLogin={onLogin} />} />
      <Route path="/products" element={<Products user={user} />} />
      <Route path="/testmap" element={<TestMap />} />


      {/* Protected Routes */}
      <Route
        path="/cart"
        element={
          <PrivateRoute>
            <Cart user={user} />
          </PrivateRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <PrivateRoute>
            <Checkout user={user} />
          </PrivateRoute>
        }
      />

      {/* Admin Route */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
