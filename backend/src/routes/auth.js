import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = express.Router();

authRouter.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username, active: true });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        username: user.username,
        role: user.role
      },
      env.jwtSecret,
      { expiresIn: "12h" }
    );

    return res.json({
      token,
      user: user.toSafeJSON()
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    return res.json({ user: req.user.toSafeJSON() });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user profile" });
  }
});
