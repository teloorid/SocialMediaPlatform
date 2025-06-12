const mongoose = require('mongoose');
const { Schema } = mongoose;

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title is required'],
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      minlength: [10, 'Content must be at least 10 characters long'],
      maxlength: [2000, 'Content cannot exceed 2000 characters'],
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post author is required'],
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    category: {
      type: String,
      enum: [
        'technology',
        'lifestyle',
        'business',
        'entertainment',
        'sports',
        'other',
      ],
      default: 'other',
    },
    likes: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        likedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: 500,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isPublished: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    readTime: {
      type: Number, // in minutes
      default: function () {
        // Calculate read time: average 200 words per minute
        const wordCount = this.content.split(' ').length;
        return Math.ceil(wordCount / 200);
      },
    },
    views: {
      type: Number,
      default: 0,
    },
    featuredImage: {
      type: String, // URL to image
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for like count
postSchema.virtual('likeCount').get(function () {
  return this.likes.length;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function () {
  return this.comments.length;
});

// Virtual for engagement score
postSchema.virtual('engagementScore').get(function () {
  return this.likeCount + this.commentCount + this.views;
});

// Index for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, publishedAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ 'likes.user': 1 });

// Pre-save middleware
postSchema.pre('save', function (next) {
  if (this.isModified('content')) {
    // Recalculate read time if content changed
    const wordCount = this.content.split(' ').length;
    this.readTime = Math.ceil(wordCount / 200);
  }
  next();
});

// Static methods
postSchema.statics.findPublished = function () {
  return this.find({ isPublished: true }).populate('author', 'username email');
};

postSchema.statics.findByCategory = function (category) {
  return this.find({ category, isPublished: true }).populate(
    'author',
    'username email'
  );
};

// Instance methods
postSchema.methods.like = function (userId) {
  const alreadyLiked = this.likes.some(
    (like) => like.user.toString() === userId.toString()
  );

  if (alreadyLiked) {
    this.likes = this.likes.filter(
      (like) => like.user.toString() !== userId.toString()
    );
  } else {
    this.likes.push({ user: userId });
  }

  return this.save();
};

postSchema.methods.addComment = function (userId, content) {
  this.comments.push({
    user: userId,
    content: content,
  });
  return this.save();
};

module.exports = mongoose.model('Post', postSchema);
