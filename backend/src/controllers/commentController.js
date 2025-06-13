const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { validationResult } = require('express-validator');

class CommentController {
  // @desc    Create a new comment
  // @route   POST /api/v1/posts/:postId/comments
  // @access  Private
  static async createComment(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Please provide valid input data',
          details: errors.array(),
        });
      }

      const { content, parentComment } = req.body;
      const { postId } = req.params;

      // Validate post exists
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found',
          message: `Post with ID ${postId} does not exist`,
        });
      }

      // If it's a reply, validate parent comment exists
      if (parentComment) {
        const parent = await Comment.findById(parentComment);
        if (!parent || parent.post.toString() !== postId) {
          return res.status(404).json({
            success: false,
            error: 'Parent comment not found',
            message: 'Invalid parent comment for this post',
          });
        }
      }

      const comment = await Comment.create({
        content,
        author: req.user.id,
        post: postId,
        parentComment: parentComment || null,
      });

      // Update post comment count
      await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

      // Populate author info
      await comment.populate('author', 'username email profile.avatar');

      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment created successfully',
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Please provide valid input data',
          details: validationErrors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error.message,
      });
    }
  }

  // @desc    Get comments for a post with nested replies
  // @route   GET /api/v1/posts/:postId/comments
  // @access  Public
  static async getPostComments(req, res) {
    try {
      const { postId } = req.params;
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Get top-level comments
      const [comments, totalComments] = await Promise.all([
        Comment.find({
          post: postId,
          parentComment: null,
        })
          .populate('author', 'username email profile.avatar')
          .populate({
            path: 'replies',
            populate: {
              path: 'author',
              select: 'username email profile.avatar',
            },
            options: { sort: { createdAt: 1 } },
          })
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        Comment.countDocuments({
          post: postId,
          parentComment: null,
        }),
      ]);

      const totalPages = Math.ceil(totalComments / parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          comments,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalComments,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1,
            limit: parseInt(limit),
          },
        },
        message: `Retrieved ${comments.length} comments successfully`,
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid Post ID',
          message: 'Please provide a valid post ID',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error.message,
      });
    }
  }

  // @desc    Get replies for a specific comment
  // @route   GET /api/v1/comments/:commentId/replies
  // @access  Public
  static async getCommentReplies(req, res) {
    try {
      const { commentId } = req.params;
      const { page = 1, limit = 5 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [replies, totalReplies] = await Promise.all([
        Comment.find({ parentComment: commentId })
          .populate('author', 'username email profile.avatar')
          .sort({ createdAt: 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Comment.countDocuments({ parentComment: commentId }),
      ]);

      const totalPages = Math.ceil(totalReplies / parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          replies,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalReplies,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1,
            limit: parseInt(limit),
          },
        },
        message: `Retrieved ${replies.length} replies successfully`,
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid Comment ID',
          message: 'Please provide a valid comment ID',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error.message,
      });
    }
  }

  // @desc    Update comment
  // @route   PUT /api/v1/comments/:commentId
  // @access  Private (Comment owner only)
  static async updateComment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Please provide valid input data',
          details: errors.array(),
        });
      }

      const { commentId } = req.params;
      const { content } = req.body;

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found',
          message: `Comment with ID ${commentId} does not exist`,
        });
      }

      // Check ownership
      if (comment.author.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Authorization Error',
          message: 'You can only update your own comments',
        });
      }

      comment.content = content;
      comment.isEdited = true;
      comment.editedAt = new Date();

      await comment.save();
      await comment.populate('author', 'username email profile.avatar');

      res.status(200).json({
        success: true,
        data: comment,
        message: 'Comment updated successfully',
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid Comment ID',
          message: 'Please provide a valid comment ID',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error.message,
      });
    }
  }

  // @desc    Delete comment
  // @route   DELETE /api/v1/comments/:commentId
  // @access  Private (Comment owner only)
  static async deleteComment(req, res) {
    try {
      const { commentId } = req.params;

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found',
          message: `Comment with ID ${commentId} does not exist`,
        });
      }

      // Check ownership
      if (comment.author.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Authorization Error',
          message: 'You can only delete your own comments',
        });
      }

      await comment.remove();

      res.status(200).json({
        success: true,
        data: {},
        message: 'Comment deleted successfully',
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid Comment ID',
          message: 'Please provide a valid comment ID',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error.message,
      });
    }
  }

  // @desc    Like/Unlike comment
  // @route   POST /api/v1/comments/:commentId/like
  // @access  Private
  static async likeComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found',
          message: `Comment with ID ${commentId} does not exist`,
        });
      }

      const existingLike = comment.likes.find(
        (like) => like.user.toString() === userId
      );

      if (existingLike) {
        // Unlike
        comment.likes = comment.likes.filter(
          (like) => like.user.toString() !== userId
        );
        comment.likeCount = Math.max(0, comment.likeCount - 1);
      } else {
        // Like
        comment.likes.push({ user: userId });
        comment.likeCount += 1;
      }

      await comment.save();
      await comment.populate('author', 'username email profile.avatar');

      const isLiked = !existingLike;

      res.status(200).json({
        success: true,
        data: {
          comment,
          isLiked,
          likeCount: comment.likeCount,
        },
        message: isLiked
          ? 'Comment liked successfully'
          : 'Comment unliked successfully',
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid Comment ID',
          message: 'Please provide a valid comment ID',
        });
      }

      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error.message,
      });
    }
  }
}

module.exports = CommentController;
