const express = require('express');
const {
  register,
  login,
  logout,
  logoutAll,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  refreshToken,
} = require('../controllers/authController');
const { protect, rateLimitByUser } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordUpdate,
  validateEmail,
  validatePasswordReset,
  validateToken,
} = require('../middleware/validation/authValidation');

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', rateLimitByUser(15 * 60 * 1000, 5), validateLogin, login);
router.post('/forgot-password', validateEmail, forgotPassword);
router.put(
  '/reset-password/:resettoken',
  validateToken,
  validatePasswordReset,
  resetPassword
);
router.get('/verify-email/:token', validateToken, verifyEmail);
router.post('/refresh-token', refreshToken);

// Protected routes
router.use(protect); // All routes after this are protected

router.get('/me', getMe);
router.put('/me', validateProfileUpdate, updateProfile);
router.put('/password', validatePasswordUpdate, updatePassword);
router.post('/logout', logout);
router.post('/logout-all', logoutAll);
router.post('/resend-verification', resendVerification);

module.exports = router;
