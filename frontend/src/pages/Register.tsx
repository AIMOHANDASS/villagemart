import { useState } from "react";
import { registerUser } from "../api";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await registerUser(form);
      alert("User registered successfully. ID: " + data.userId);
    } catch (err) {
      alert("Registration failed");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>User Register</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Name" onChange={handleChange} /><br /><br />
        <input name="email" placeholder="Email" onChange={handleChange} /><br /><br />
        <input name="phone" placeholder="Phone" onChange={handleChange} /><br /><br />
        <input name="address" placeholder="Address" onChange={handleChange} /><br /><br />
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;
