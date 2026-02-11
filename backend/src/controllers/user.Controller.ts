import { Request, Response } from "express";
import db from "../db";
import bcrypt from "bcryptjs";

/* =========================
   SIGNUP
   POST /api/users/signup
========================= */
export const signupUser = async (req: Request, res: Response) => {
  const {
    name,
    username,
    email,
    phone,
    address,
    password,
    latitude,
    longitude,
  } = req.body;

  /* ✅ BASIC VALIDATION */
  if (!name || !username || !email || !phone || !password) {
    return res.status(400).json({
      message: "Name, username, email, phone and password are required",
    });
  }

  try {
    /* ✅ CHECK DUPLICATE USERNAME OR EMAIL */
    const checkSql =
      "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1";

    db.query(checkSql, [username, email], async (checkErr: any, rows: any[]) => {
      if (checkErr) {
        console.error("Duplicate check error:", checkErr);
        return res.status(500).json({
          message: "Database error",
        });
      }

      if (rows.length > 0) {
        return res.status(409).json({
          message: "Username or Email already exists",
        });
      }

      /* ✅ HASH PASSWORD */
      const hashedPassword = await bcrypt.hash(password, 10);

      /* ✅ INSERT USER */
      const insertSql = `
        INSERT INTO users
        (name, username, email, phone, password, address, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertSql,
        [
          name,
          username,
          email,
          phone,
          hashedPassword,
          address || null,
          latitude || null,
          longitude || null,
        ],
        (err: any, result: any) => {
          if (err) {
            console.error("Signup DB error:", err);
            return res.status(500).json({
              message: err.sqlMessage || "Database error",
            });
          }

          return res.status(201).json({
            message: "Signup successful",
            user: {
              id: result.insertId,
              name,
              username,
              email,
              phone,
              address,
              latitude,
              longitude,
            },
          });
        }
      );
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   LOGIN
   POST /api/users/login
========================= */
export const loginUser = (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: "Username and password are required",
    });
  }

  const sql = `
    SELECT id, name, username, email, phone, address, latitude, longitude, password
    FROM users
    WHERE username = ?
    LIMIT 1
  `;

  db.query(sql, [username], async (err: any, rows: any[]) => {
    if (err) {
      console.error("Login DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const user = rows[0];

    /* ✅ VERIFY PASSWORD */
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    delete user.password;

    return res.json({
      message: "Login successful",
      user,
    });
  });
};

/* =========================
   CHECK USERNAME AVAILABILITY
   GET /api/users/check-username/:username
========================= */
export const checkUsername = (req: Request, res: Response) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ available: false });
  }

  const sql = "SELECT id FROM users WHERE username = ? LIMIT 1";

  db.query(sql, [username], (err: any, rows: any[]) => {
    if (err) {
      console.error("Username check error:", err);
      return res.status(500).json({ available: false });
    }

    return res.json({
      available: rows.length === 0,
    });
  });
};
