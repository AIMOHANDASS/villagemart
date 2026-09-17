import rateLimit from "express-rate-limit";

// Global limiter: 1000 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/auth') || req.path.includes('/login')
});

// Auth limiter: 20 requests per 15 minutes per IP (login, signup, OTP)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Increased threshold
  message: { success: false, message: "Too many authentication attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment/Order Mutation limiter: 30 requests per 15 minutes per IP
export const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many order requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Order Fetching limiter: 100 requests per 15 minutes per IP (reading order history)
export const orderFetchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many order requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public Product limiter: 300 requests per 15 minutes per IP (search, browse)
export const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, 
  message: { success: false, message: "Too many product requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
