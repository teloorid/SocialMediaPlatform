const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    likes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    likeCount: {
      type: Number,
      default: 0,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for nested replies
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
});

// Indexes for performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ 'likes.user': 1 });

// Pre-save middleware to update parent comment reply count
commentSchema.pre('save', async function (next) {
  if (this.isNew && this.parentComment) {
    await mongoose
      .model('Comment')
      .findByIdAndUpdate(this.parentComment, { $inc: { replyCount: 1 } });
  }
  next();
});

// Pre-remove middleware to update counts
commentSchema.pre('remove', async function (next) {
  // Update post comment count
  await mongoose
    .model('Post')
    .findByIdAndUpdate(this.post, { $inc: { commentCount: -1 } });

  // Update parent comment reply count
  if (this.parentComment) {
    await mongoose
      .model('Comment')
      .findByIdAndUpdate(this.parentComment, { $inc: { replyCount: -1 } });
  }

  // Remove all child comments
  await mongoose.model('Comment').deleteMany({ parentComment: this._id });

  next();
});

module.exports = mongoose.model('Comment', commentSchema);
