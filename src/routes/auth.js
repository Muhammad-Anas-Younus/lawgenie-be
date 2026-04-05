import { Router } from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";

const router = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const registerValidation = [
  body("fullName")
    .trim()
    .notEmpty().withMessage("Full name is required.")
    .isLength({ min: 2, max: 100 }).withMessage("Full name must be 2-100 characters."),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email address.")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required.")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  body("phone")
    .trim()
    .notEmpty().withMessage("Phone number is required."),
  body("city")
    .trim()
    .notEmpty().withMessage("City is required."),
  body("role")
    .optional()
    .isIn(["client", "lawyer", "mufti", "admin"]).withMessage("Role must be one of: client, lawyer, mufti, admin."),
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please provide a valid email address.")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required."),
];

router.post("/register", registerValidation, validate, async (req, res) => {
  const { fullName, email, password, phone, city, role } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered." });
    }

    const user = new User({
      fullName,
      email,
      password,
      phone,
      city,
      role: role || "client",
      isProfileCompleted: false,
    });

    await user.save();

    const token = generateToken(user._id);

    return res.status(201).json({
      message: "User registered successfully.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        city: user.city,
        role: user.role,
        isProfileCompleted: user.isProfileCompleted,
      },
    });
  } catch (err) {
    console.error("[POST /api/auth/register] Error:", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
});

router.post("/login", loginValidation, validate, async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        city: user.city,
        role: user.role,
        isProfileCompleted: user.isProfileCompleted,
      },
    });
  } catch (err) {
    console.error("[POST /api/auth/login] Error:", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
});

export default router;
