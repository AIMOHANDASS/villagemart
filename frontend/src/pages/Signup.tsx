import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api";

export default function Signup({ onLogin }: { onLogin: (u: any) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    address: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_BASE}/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ Signup failed: ${data.message}`);
        return;
      }

      alert("✅ Signup successful!");
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        onLogin(data.user);
      }
      navigate("/");
    } catch (error: any) {
      console.error("Signup error:", error);
      alert("❌ Network error. Try again later.");
    }
  };

  return (
    // UPDATED: Professional background (subtle gradient of cool colors)
    <div
      className="
        min-h-screen flex items-center justify-center 
        bg-gray-50 
        md:bg-gradient-to-br from-gray-200 to-blue-50
        p-4
      "
    >
      <form
        onSubmit={handleSubmit}
        // UPDATED: Modern form styling with shadow, rounded corners, and hover effect
        className="
          max-w-md w-full mx-auto p-8 
          bg-white 
          rounded-2xl 
          shadow-xl 
          hover:shadow-2xl 
          transition duration-300 ease-in-out 
          transform hover:scale-[1.01]
          border border-gray-200
          space-y-4 
        "
      >
        <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-800">
          Create Account
        </h2>

        {["name", "username", "email", "phone", "address", "password"].map(
          (field) => (
            <input
              key={field}
              name={field}
              type={field === "password" ? "password" : "text"}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={(formData as any)[field]}
              onChange={handleChange}
              required={["name", "username", "email", "password"].includes(
                field
              )}
              // UPDATED: Modern input styling with focus ring
              className="
                w-full p-3 
                border border-gray-300 
                rounded-xl 
                focus:outline-none 
                focus:ring-2 
                focus:ring-blue-500 
                focus:border-transparent 
                transition duration-300
              "
            />
          )
        )}
        <button
          type="submit"
          // UPDATED: Professional button with gradient, shadow, and hover effects
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
          Sign Up
        </button>

        <p className="text-center mt-4 text-gray-600 text-sm">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="
              text-blue-600 
              font-medium 
              hover:text-blue-800 
              transition duration-200 
              focus:outline-none
            "
          >
            Log in
          </button>
        </p>
      </form>
    </div>
  );
}