const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxLength: [30, 'Username cannot exceed 30 characters'],
      match: [
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers and underscores',
      ],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
      validate: {
        validator: function (password) {
          // The password must contain at least one letter and one number
          return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/.test(
            password
          );
        },
        message:
          'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
      },
    },

    // Authentication fields
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user',
    },

    // Account verification
    emailVerificationToken: String,
    emailVerificationExpire: Date,

    // Password reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Security tracking
    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: Date,

    // Session Management
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: {
          type: Date,
          default: () => new Date(Date.now() + 7 * 24 * 60 * 1000),
        },
      },
    ],

    profile: {
      firstName: {
        type: String,
        trim: true,
        maxLength: [50, 'First name cannot exceed 50 characters'],
      },
      lastName: {
        type: String,
        trim: true,
        maxLength: [50, 'Last name cannot exceed 50 characters'],
      },
      bio: {
        type: String,
        maxLength: [500, 'Bio cannot exceed 500 characters'],
        default: '',
      },
      avatar: {
        type: String,
        default: '',
        validate: {
          validator: function (url) {
            if (!url) return true;
            return /^https?:\/\/.+/.test(url);
          },
          message: 'Avatar must be a valid URL',
        },
      },
      dateOfBirth: {
        type: Date,
        validate: {
          validator: function (date) {
            if (!date) return true;
            return date < new Date();
          },
          message: 'Date of birth cannot be in the future',
        },
      },
      location: {
        type: String,
        maxLength: [100, 'Location cannot exceed 100 characters'],
      },
      website: {
        type: String,
        maxLength: [200, 'Website URL exceed 200 characters'],
        validate: {
          validator: function (url) {
            if (!url) return true;
            return /^https?:\/\/.+/.test(url);
          },
          message: 'Website must be a valid URL',
        },
      },
      socialLinks: {
        twitter: String,
        linkedin: String,
        github: String,
        instagram: String,
      },
    },
    settings: {
      isPrivate: {
        type: Boolean,
        default: false,
      },
      allowMessages: {
        type: Boolean,
        default: true,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      twoFactorEnabled: {
        type: Boolean,
        default: false,
      },
    },
    status: {
      isActive: {
        type: Boolean,
        default: true,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      emailVerified: {
        type: Boolean,
        default: false,
      },
      lastLogin: {
        type: Date,
      },
      lastSeen: {
        type: Date,
        default: Date.now,
      },
      ipAddress: {
        type: String,
      },
      userAgent: {
        type: String,
      },
    },

    // Social media specific fields
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    postsCount: {
      type: Number,
      default: 0,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpire;
        delete ret.refreshTokens;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpire;
        delete ret.refreshTokens;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
  }
);

// Virtual for full name
userSchema.virtual('profile.fullName').get(function () {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return (
    this.profile.firstName || this.profile.lastName || this.profile.username
  );
});

// Virtual for age calculation
userSchema.virtual('profile.age').get(function () {
  if (!this.profile.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.profile.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < today.getDate())) {
    age--;
  }
  return age;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes for better performance
userSchema.index({ username: 1, email: 1 });
userSchema.index({ 'status.isActive': 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ 'refreshTokens.token': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'status.lastLogin': -1 });

// Pre save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only has the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(
      parseInt(process.env.BCRYPT_ROUNDS) || 12
    );
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update lastSeen
userSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('status.lastLogin')) {
    this.status.lastSeen = new Date();
  }
  next();
});

// Instance methods
// Check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    console.error('Password check failed: ', error.message);
  }
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function () {
  const payload = {
    id: this._id,
    email: this.email,
    username: this.username,
    role: this.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  });
};

// Generate token
userSchema.methods.generateRefreshToken = function () {
  const refreshToken = crypto.randomBytes(40).toString('hex');

  this.refreshTokens.push({
    token: refreshToken,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return refreshToken;
};

// Remove refresh token
userSchema.methods.removeRefreshToken = function (tokenToRemove) {
  this.refreshTokens = this.refreshTokens.filter(
    (tokenObj) => tokenObj.token !== tokenToRemove
  );
};

// Clean expired refresh tokens
userSchema.methods.cleanExpiredTokens = function() {
  try {
    // Ensure refreshTokens exists and is an array
    if (!this.refreshTokens || !Array.isArray(this.refreshTokens)) {
      this.refreshTokens = [];
      return;
    }

    const now = new Date();
    this.refreshTokens = this.refreshTokens.filter((tokenObj) => {
      try {
        return tokenObj && tokenObj.expiresAt && tokenObj.expiresAt > now;
      } catch (err) {
        console.warn('Invalid token object:', tokenObj);
        return false; // Remove invalid tokens
      }
    });
  } catch (error) {
    console.error('Error cleaning expired tokens:', error);
    this.refreshTokens = []; // Reset to empty array on error
  }
};

// Generate email verification tokens
userSchema.methods.getEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(20).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  this.emailVerificationExpire =
    Date.now() +
    parseInt(process.env.EMAIL_VERIFICATION_EXPIRE) * 60 * 60 * 1000;

  return verificationToken;
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire =
    Date.now() + parseInt(process.env.RESET_PASSWORD_EXPIRE) * 60 * 1000;

  return resetToken;
};

// Handle failed login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        lockUntil: 1,
      },
      $set: {
        loginAttempts: 1,
      },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after max failed attempts
  if (this.loginAttempts + 1 >= parseInt(process.env.MAX_LOGIN_ATTEMPTS)) {
    updates.$set = {
      lockUntil: Date.now() + parseInt(process.env.LOCKOUT_TIME) * 60 * 1000,
    };
  }

  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1,
    },
    $set: {
      lastLogin: new Date(),
    },
  });
};

//Static methods
userSchema.statics.getAuthenticatedUser = async function (
  identifier,
  password
) {
  // Look for user by username or email
  const user = await this.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  }).select('+password + loginAttempts +lockUntil');

  if (!user) {
    return { user: null, reason: 'USER_NOT_FOUND' };
  }

  // Check if the account is locked
  if (user.isLocked) {
    await user.incLoginAttempts();
    return { user: null, reason: 'ACCOUNT_LOCKED' };
  }

  const isMatch = await user.matchPassword(password);

  if (isMatch) {
    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
      });
    }
    return { user, reason: null };
  } else {
    // Increment login attempts
    await user.incLoginAttempts();
    return { user: null, reason: 'INVALID_PASSWORD' };
  }
};

// Find users by search term
userSchema.statics.searchUsers = function (searchTerm, limit = 10) {
  return this.find({
    $or: [
      { username: { $regex: searchTerm, $options: 'i' } },
      { 'profile.firstName': { $regex: searchTerm, $options: 'i' } },
      { 'profile.lastName': { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
    ],
    'status.isActive': true,
  })
    .select('-password')
    .limit(limit);
};

// Get user statistics
userSchema.statics.getUserStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$status.isActive', true] }, 1, 0],
          },
        },
        verifiedUsers: {
          $sum: {
            $cond: [{ $eq: ['$status.isVerified', true] }, 1, 0],
          },
        },
        avgPostsPerUser: { $avg: '$postsCount' },
      },
    },
  ]);

  return (
    stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0,
      avgPostsPerUser: 0,
    }
  );
};

module.exports = mongoose.model('User', userSchema);
