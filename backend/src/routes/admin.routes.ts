import express from "express";

const router = express.Router();

const ADMIN_CREDENTIALS = {
  username: "Mohan",
  password: "mohan123",
};

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    return res.json({ success: true, message: "Admin login successful" });
  }

  res.status(401).json({ success: false, message: "Invalid credentials" });
});

export default router;
