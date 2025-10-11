import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api";

type Props = { onLogin: (u: any) => void };

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // ✅ Admin shortcut
    if (username === "Mohan" && password === "mohan123") {
      const admin = { username: "Mohan", email: "admin@local", role: "admin" };
      localStorage.setItem("user", JSON.stringify(admin));
      onLogin(admin);
      navigate("/admin");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        return;
      }

      if (data.token && data.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        onLogin(data.user);
      }

      navigate("/");
    } catch (err: any) {
      console.error("Login error:", err);
      setError("❌ Network error. Try again later.");
    }
  };

  return (
    // Wrapper for centering the form and setting a page background
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        // Tailwind Classes for Form Container: Modern, Animated, Elevated
        className="
          max-w-sm w-full mx-auto p-8 
          bg-white 
          rounded-2xl 
          shadow-2xl 
          hover:shadow-3xl 
          transition duration-500 ease-in-out 
          transform hover:scale-[1.01]
          border border-gray-100
        "
      >
        <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-800">
          Welcome Back
        </h2>

        {/* Error Message Style: Prominent with animation */}
        {error && (
          <p className="text-red-600 bg-red-100 p-3 rounded-lg border border-red-300 mb-4 font-medium animate-pulse">
            {error}
          </p>
        )}

        {/* Username Input Style: Focus ring effect */}
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="
            w-full p-3 mb-4 
            border border-gray-300 
            rounded-xl 
            focus:outline-none 
            focus:ring-2 
            focus:ring-blue-500 
            focus:border-transparent 
            transition duration-300
          "
          required
        />
        
        {/* Password Input Style: Focus ring effect */}
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="
            w-full p-3 mb-6 
            border border-gray-300 
            rounded-xl 
            focus:outline-none 
            focus:ring-2 
            focus:ring-blue-500 
            focus:border-transparent 
            transition duration-300
          "
          required
        />

        {/* Login Button Style: Gradient, Shadow, Hover Lift and Color Shift */}
        <button
          type="submit"
          className="
            w-full 
            bg-gradient-to-r from-blue-600 to-blue-500 
            text-white 
            text-lg 
            font-semibold 
            p-3 
            rounded-xl 
            shadow-lg 
            shadow-blue-500/50 
            hover:shadow-xl 
            hover:from-blue-700 hover:to-blue-600 
            transition duration-300 ease-in-out 
            transform hover:-translate-y-0.5
          "
        >
          Login
        </button>

        {/* Sign Up Link Style: Subtle hover effect */}
        <p className="text-center mt-6 text-gray-600">
          Don’t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="
              text-blue-600 
              font-medium 
              hover:text-blue-800 
              transition duration-200 
              focus:outline-none
            "
          >
            Sign up
          </button>
        </p>
      </form>
    </div>
  );
};

export default Login;