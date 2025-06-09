const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
          // Password must contain at least one letter and one number
          return /^(?=.*[A-Za-z])(?=.*\d)/.test(password);
        },
        message: 'Password must contain at least one letter and one number',
      },
    },
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
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
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

// Indexes for better performance
userSchema.index({ username: 1, email: 1 });
userSchema.index({ 'status.isActive': 1 });
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

// Instance method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Static method to find users by search term
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

// Static method to get user statistics
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
