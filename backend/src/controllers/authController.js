const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const { validationResult } = require('express-validator');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse('Validation error', 400, errors.array()));
  }

  const { username, email, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username';
    return next(
      new ErrorResponse(`User with this ${field} already exists`, 400)
    );
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    profile: {
      firstName,
      lastName,
    },
    status: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  // Generate email verification token
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Create verification URL
  const verificationUrl = `${process.env.CLIENT_URL}/auth/verify-email/${verificationToken}`;

  // Email message
  const message = `
    <h1>Welcome to Social Media Platform!</h1>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
    <p>This link will expire in 24 hours.</p>
    <p>If you didn't create this account, please ignore this email.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Account Verification',
      message,
    });

    // Generate tokens
    const accessToken = user.getSignedJwtToken();
    const refreshToken = user.generateRefreshToken();
    await user.save({ validateBeforeSave: false });

    // Set cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    res.status(201).cookie('accessToken', accessToken, cookieOptions).json({
      success: true,
      message:
        'User registered successfully. Please check your email to verify your account.',
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new ErrorResponse('Email could not be sent. Please try again later.', 500)
    );
  }
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse('Validation error', 400, errors.array()));
  }

  const { username, password, rememberMe } = req.body;

  // Get authenticated user
  const result = await User.getAuthenticatedUser(username, password);

  if (!result.user) {
    let message = 'Invalid credentials';

    switch (result.reason) {
      case 'USER_NOT_FOUND':
        message = 'No account found with this username or email';
        break;
      case 'ACCOUNT_LOCKED':
        message = `Account temporarily locked due to too many failed login attempts. Try again in ${process.env.LOCKOUT_TIME} minutes.`;
        break;
      case 'INVALID_PASSWORD':
        message = 'Invalid password';
        break;
    }

    return next(new ErrorResponse(message, 401));
  }

  const user = result.user;

  // Update login information
  user.status.lastLogin = new Date();
  user.status.lastSeen = new Date();
  user.status.ipAddress = req.ip;
  user.status.userAgent = req.get('User-Agent');

  // Clean expired refresh tokens
  user.cleanExpiredTokens();

  // Generate tokens
  const accessToken = user.getSignedJwtToken();
  const refreshToken = user.generateRefreshToken();

  await user.save({ validateBeforeSave: false });

  // Set cookie options
  const cookieExpire = rememberMe ? 30 : 1; // 30 days if remember me, 1 day otherwise
  const cookieOptions = {
    expires: new Date(Date.now() + cookieExpire * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.status(200).cookie('accessToken', accessToken, cookieOptions).json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      accessToken,
      refreshToken,
    },
  });
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (refreshToken) {
    // Remove specific refresh token
    req.user.removeRefreshToken(refreshToken);
    await req.user.save({ validateBeforeSave: false });
  }

  // Clear cookie
  res.cookie('accessToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @desc    Logout from all devices
// @route   POST /api/v1/auth/logout-all
// @access  Private
exports.logoutAll = asyncHandler(async (req, res, next) => {
  // Clear all refresh tokens
  req.user.refreshTokens = [];
  await req.user.save({ validateBeforeSave: false });

  // Clear cookie
  res.cookie('accessToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out from all devices successfully',
  });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update user profile
// @route   PUT /api/v1/auth/me
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse('Validation error', 400, errors.array()));
  }

  const fieldsToUpdate = {
    'profile.firstName': req.body.firstName,
    'profile.lastName': req.body.lastName,
    'profile.bio': req.body.bio,
    'profile.location': req.body.location,
    'profile.website': req.body.website,
    'profile.dateOfBirth': req.body.dateOfBirth,
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach((key) => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Update password
// @route   PUT /api/v1/auth/password
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse('Validation error', 400, errors.array()));
  }

  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  // Generate new token
  const token = user.getSignedJwtToken();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
    token,
  });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse('Validation error', 400, errors.array()));
  }

  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password/${resetToken}`;

  const message = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>This link will expire in ${process.env.RESET_PASSWORD_EXPIRE} minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      message,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse('Validation error', 400, errors.array()));
  }

  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  // Clear all refresh tokens for security
  user.refreshTokens = [];

  await user.save();

  const token = user.getSignedJwtToken();

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    token,
  });
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const emailVerificationToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new ErrorResponse('Invalid or expired verification token', 400)
    );
  }

  // Mark email as verified
  user.status.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
  });
});

// @desc    Resend email verification
// @route   POST /api/v1/auth/resend-verification
// @access  Private
exports.resendVerification = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (user.status.emailVerified) {
    return next(new ErrorResponse('Email is already verified', 400));
  }

  // Generate new verification token
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Create verification URL
  const verificationUrl = `${process.env.CLIENT_URL}/auth/verify-email/${verificationToken}`;

  const message = `
    <h1>Email Verification</h1>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
    <p>This link will expire in 24 hours.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Email Verification',
      message,
    });

    res.status(200).json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error) {
    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new ErrorResponse('Refresh token required', 401));
  }

  // Find user with this refresh token
  const user = await User.findOne({
    'refreshTokens.token': refreshToken,
    'refreshTokens.expiresAt': { $gt: new Date() },
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired refresh token', 401));
  }

  // Generate new access token
  const accessToken = user.getSignedJwtToken();

  // Optionally rotate refresh token
  user.removeRefreshToken(refreshToken);
  const newRefreshToken = user.generateRefreshToken();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    data: {
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
});
