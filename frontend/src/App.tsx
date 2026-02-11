import React, { useState } from "react";
import AppRoutes from "./router";
import MobileBottomNav from "@/components/MobileBottomNav";

const App: React.FC = () => {
  const [user, setUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  /* ✅ Login */
  const handleLogin = (userObj: any) => {
    localStorage.setItem("user", JSON.stringify(userObj));
    setUser(userObj);
  };

  /* ✅ Logout */
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <>
      {/* 🌐 Routes */}
      <AppRoutes
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* 📱 Mobile Bottom Navigation */}
      <MobileBottomNav user={user} />
    </>
  );
};

export default App;
