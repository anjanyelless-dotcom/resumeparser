import { rateLimit } from "express-rate-limit";

/**
 * Rate limiter for company scan endpoint
 * 10 requests per minute per user
 */
export const scanRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  message: {
    error: "Too many scan requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General rate limiter for other endpoints
 * 100 requests per minute per user
 */
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
