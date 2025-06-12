const { body, param } = require('express-validator');
const User = require('../../models/User');

// Registration validation rules
exports.validateRegister = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores')
    .custom(async (value) => {
      const existingUser = await User.findOne({ username: value });

      if (existingUser) {
        throw new Error('Username already exists');
      }

      return true;
    }),
  body('email')
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .custom(async (value) => {
      const existingUser = await User.findOne({ email: value });

      if (existingUser) {
        throw new Error('Email already exists');
      }

      return true;
    }),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lower case letter and one number'
    ),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body('firstName')
    .trim()
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters.'),

  body('lastName')
    .trim()
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters.'),
];

// Login validation rules
exports.validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),

  body('password').notEmpty().withMessage('Password is required'),

  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean'),
];

// Profile update validation
exports.validateProfileUpdate = [
  body('firstName')
    .trim()
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters.'),

  body('lastName')
    .trim()
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters.'),

  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters.'),

  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),

  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters.'),

  body('website')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Website URL cannot exceed 200 characters.')
    .isURL()
    .withMessage('Website URL must be a valid URL'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .custom((value) => {
      if (new Date(value) >= new Date()) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),
];

// Password update validation
exports.validatePasswordUpdate = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/)
    .withMessage(
      'New password must contain at least one letter, one number, and one special character'
    ),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  }),
];

// Password change validation
exports.validPasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be a t least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'New password must contain at least one uppercase letter, one lowercase and one number'
    ),

  body('confirmNewPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('New passwords do not match');
    }
    return true;
  }),
];

// Email validation
exports.validateEmail = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

// Password reset validation
exports.validatePasswordReset = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('New password must be a t least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase and one number'
    ),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
];

// Token validation
exports.validateToken = [
  param('token').isLength({ min: 20 }).withMessage('Invalid token format'),
];
