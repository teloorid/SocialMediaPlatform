const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Middleware to protect routes - verify JWt token
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check for token in cookies
  else if (req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(new ErrorResponse('Access denied. No token provided', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    // Check if user is active
    if (!user.status.isActive) {
      return next(new ErrorResponse('User account is deacrivated', 401));
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ErrorResponse('Token Expired', 401));
    } else if (error.name === 'JsonWebTokenError') {
      return next(new ErrorResponse('Invalid Token', 401));
    }
    return next(new ErrorResponse('Token verification failed', 401));
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Check if user owns the resource or is admin
exports.ownerOrAdmin = (resourceUserField = 'user') => {
  return asyncHandler(async (req, res, next) => {
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Get the resource ID from params
    const resourceId = req.params.id;

    // This would typically fetch the resource and check ownership
    // For now, we'll just check if the user ID matches
    if (req.user.id !== resourceId) {
      return next(
        new ErrorResponse(
          'Access denied. You can only access your own resources.',
          403
        )
      );
    }

    next();
  });
};

// Optional auth - user might or might not be logged in
exports.optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (user && user.status.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, but that's okay for optional auth
      console.log('Optional auth token invalid:', error.message);
    }
  }

  next();
});

// Rate limiting middleware
exports.rateLimitByUser = (windowMs = 15 * 60 * 1000, max = 100) => {
  const attempts = new Map();

  return (req, res, next) => {
    const userId = req.user ? req.user.id : req.ip;
    const now = Date.now();

    if (!attempts.has(userId)) {
      attempts.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userAttempts = attempts.get(userId);

    if (now > userAttempts.resetTime) {
      userAttempts.count = 1;
      userAttempts.resetTime = now + windowMs;
      return next();
    }

    if (userAttempts.count >= max) {
      return next(
        new ErrorResponse(`Too many requests. Try again later.`, 429)
      );
    }

    userAttempts.count++;
    next();
  };
};
