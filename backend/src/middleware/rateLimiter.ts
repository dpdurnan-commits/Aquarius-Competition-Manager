import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints to prevent brute force attacks
 * Limits to 5 requests per 15 minutes per IP address
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for successful requests (only count failed attempts)
  skipSuccessfulRequests: false,
});

/**
 * General API rate limiter to prevent abuse
 * Limits to 500 requests per 15 minutes per IP address in production
 * More lenient in development (1000 requests per 15 minutes)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 1000, // Increased for CSV uploads with many records
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
