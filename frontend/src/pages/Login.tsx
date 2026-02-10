import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import { GoogleLogin } from "@react-oauth/google";

type Props = { onLogin: (u: any) => void };

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  /* ---------------- NORMAL LOGIN ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    /* ✅ Admin shortcut (UNCHANGED) */
    if (username === "Mohan" && password === "mohan123") {
      const admin = { username: "Mohan", role: "admin" };
      localStorage.setItem("user", JSON.stringify(admin));
      onLogin(admin);
      navigate("/admin");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const text = await res.text();
      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        setError("Server error. Try again later.");
        return;
      }

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
      navigate("/");
    } catch {
      setError("Network error");
    }
  };

  /* ---------------- GOOGLE LOGIN ---------------- */
  const handleGoogleLogin = async (token?: string) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError("Google login failed");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
      navigate("/");
    } catch {
      setError("Google login error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm
                   border border-gray-200 animate-fade-in"
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Login
        </h2>

        {error && (
          <p className="text-red-600 bg-red-100 p-3 rounded-lg mb-4 text-sm animate-shake">
            {error}
          </p>
        )}

        {/* USERNAME */}
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full p-3 mb-4 border rounded-xl
                     focus:ring-2 focus:ring-blue-500"
        />

        {/* PASSWORD WITH EYE */}
        <div className="relative mb-2">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border rounded-xl pr-12
                       focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-lg hover:scale-110 transition"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {/* FORGOT PASSWORD */}
        <div className="text-right mb-5">
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-sm text-blue-600 hover:text-blue-800 transition"
          >
            Forgot password?
          </button>
        </div>

        {/* LOGIN BUTTON */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700
                     text-white font-semibold p-3 rounded-xl
                     transition hover:scale-[1.02]"
        >
          Login
        </button>

        {/* OR */}
        <div className="flex items-center gap-2 my-5">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-gray-500 text-sm">OR</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* GOOGLE LOGIN */}
        <GoogleLogin
          onSuccess={(res) => handleGoogleLogin(res.credential)}
          onError={() => setError("Google login cancelled")}
        />

        {/* SIGNUP LINK */}
        <p className="text-center mt-6 text-gray-600 text-sm">
          Don’t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="text-blue-600 font-medium hover:text-blue-800 transition"
          >
            Sign up
          </button>
        </p>
      </form>
    </div>
  );
};

export default Login;
