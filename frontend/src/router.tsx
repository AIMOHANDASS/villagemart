// src/AppRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import AdminPanel from "./pages/AdminPanel";
import TestMap from "./pages/TestMap";

/* ✅ NEW PAGES */
import MyOrders from "./pages/MyOrders";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";

type Props = {
  user: any;
  onLogin: (u: any) => void;
  onLogout: () => void;
};

const AppRoutes: React.FC<Props> = ({ user, onLogin }) => {

  /* 🔐 User Protected Route */
  const PrivateRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
    return user ? children : <Navigate to="/login" replace />;
  };

  /* 👑 Admin Route */
  const AdminRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
    return user?.username === "Mohan"
      ? children
      : <Navigate to="/login" replace />;
  };

  return (
    <Routes>

      {/* ================= PUBLIC ROUTES ================= */}
      <Route path="/" element={<Home user={user} />} />
      <Route path="/signup" element={<Signup onLogin={onLogin} />} />
      <Route path="/login" element={<Login onLogin={onLogin} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/products" element={<Products user={user} />} />
      <Route path="/testmap" element={<TestMap />} />

      {/* ================= USER ROUTES ================= */}
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

      <Route
        path="/my-orders"
        element={
          <PrivateRoute>
            <MyOrders user={user} />
          </PrivateRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <PrivateRoute>
            <Notifications user={user} />
          </PrivateRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile user={user} />
          </PrivateRoute>
        }
      />

      {/* ================= ADMIN ROUTE ================= */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
};

export default AppRoutes;
