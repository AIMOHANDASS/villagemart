import React, { useState, useEffect } from "react";
import AppRoutes from "./router";
import 'leaflet/dist/leaflet.css';


const App: React.FC = () => {
  const [user, setUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userObj: any) => {
    localStorage.setItem("user", JSON.stringify(userObj));
    setUser(userObj);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AppRoutes user={user} onLogin={handleLogin} onLogout={handleLogout} />
  );
};

export default App;
