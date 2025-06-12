const Post = require('../models/Post');
const User = require('../models/User');
const { validationResult } = require('express-validator');

class PostController {
  // @desc Get all posts with pagination and filtering
  // @route GET /api/v1/posts
  // @access Public
  static async getAllPosts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        author,
        tags,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      // Build a filter object
      const filter = { isPublished: true };

      if (category) filter.category = category;
      if (author) filter.author = author;
      if (tags) filter.tags = { $in: tags.split(',') };
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ];
      }

      // Build a sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute queries
      const [posts, totalPosts] = await Promise.all([
        Post.find(filter)
          .populate('author', 'username email profile.avatar')
          .select('-comments') // Exclude comments for list view
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        Post.countDocuments(filter),
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalPosts / parseInt(limit));
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      res.status(200).json({
        success: true,
        data: {
          posts,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalPosts,
            hasNextPage,
            hasPrevPage,
            limit: parseInt(limit),
          },
        },
        message: `Retrieved ${posts.length} posts successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error.message,
      });
    }
  }

  // @desc Get single post by ID
  // @route GET /api/v1/posts/:id
  // @access Public
  static async getPostById(req, res) {
    try {
      const post = await Post.findById(req.params.id)
        .populate('author', 'username email profile.avatar')
        .populate('comments.user', 'username profile.avatar')
        .populate('likes.user', 'username');

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found',
          message: `Post with ID ${req.params.id} does not exist`,
        });
      }

      // Increment view count
      post.views += 1;
      await post.save();

      res.status(200).json({
        success: true,
        data: post,
        message: 'Post retrieved successfully',
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

  // @desc Create new post
  // @route POST /api/v1/posts
  // @access Private
  static async createPost(req, res) {
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

      const { title, content, tags, category, featuredImage } = req.body;

      // Create post
      const post = await Post.create({
        title,
        content,
        author: req.user.id,
        tags: tags ? tags.split(',').map((tag) => tag.trim()) : [],
        category: category || 'other',
        featuredImage,
      });

      // Populate author info
      await post.populate('author', 'username email profile.avatar');

      res.status(201).json({
        success: true,
        data: post,
        message: 'Post created successfully',
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

  // @desc    Update post by ID
  // @route   PUT /api/v1/posts/:id
  // @access  Private (Post owner only)
  static async updatePost(req, res) {
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

      let post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found',
          message: `Post with ID ${req.params.id} does not exist`,
        });
      }

      // Check if user owns the post
      if (post.author.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Authorization Error',
          message: 'You can only update your own posts',
        });
      }

      const { title, content, tags, category, featuredImage, isPublished } =
        req.body;

      // Update fields
      if (title !== undefined) post.title = title;
      if (content !== undefined) post.content = content;
      if (tags !== undefined)
        post.tags = tags.split(',').map((tag) => tag.trim());
      if (category !== undefined) post.category = category;
      if (featuredImage !== undefined) post.featuredImage = featuredImage;
      if (isPublished !== undefined) post.isPublished = isPublished;

      await post.save();
      await post.populate('author', 'username email profile.avatar');

      res.status(200).json({
        success: true,
        data: post,
        message: 'Post updated successfully',
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid Post ID',
          message: 'Please provide a valid post ID',
        });
      }

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

  // @desc Delete post by ID
  // @route DELETE /api/v1/posts/:id
  // @access Private (Post owner only)
  static async deletePost(req, res) {
    try {
      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found',
          message: `Post with ID ${req.params.id} does not exist`,
        });
      }

      // Check if user owns the post
      if (post.author.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Authorization Error',
          message: 'You can only delete your own posts',
        });
      }

      await Post.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        data: {},
        message: 'Post deleted successfully',
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

  // @desc    Like/Unlike a post
  // @route   POST /api/v1/posts/:id/like
  // @access  Private
  static async likePost(req, res) {
    try {
      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found',
          message: `Post with ID ${req.params.id} does not exist`,
        });
      }

      await post.like(req.user.id);
      await post.populate('author', 'username email');

      const isLiked = post.likes.some(
        (like) => like.user.toString() === req.user.id
      );

      res.status(200).json({
        success: true,
        data: {
          post,
          isLiked,
          likeCount: post.likeCount,
        },
        message: isLiked
          ? 'Post liked successfully'
          : 'Post unliked successfully',
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

  // @desc    Add comment to post
  // @route   POST /api/v1/posts/:id/comment
  // @access  Private
  static async addComment(req, res) {
    try {
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Comment content is required',
        });
      }

      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found',
          message: `Post with ID ${req.params.id} does not exist`,
        });
      }

      await post.addComment(req.user.id, content);
      await post.populate('comments.user', 'username profile.avatar');

      res.status(201).json({
        success: true,
        data: {
          post,
          commentCount: post.commentCount,
        },
        message: 'Comment added successfully',
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

  // @desc    Get user's own posts
  // @route   GET /api/v1/posts/my-posts
  // @access  Private
  static async getMyPosts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [posts, totalPosts] = await Promise.all([
        Post.find({ author: req.user.id })
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        Post.countDocuments({ author: req.user.id }),
      ]);

      const totalPages = Math.ceil(totalPosts / parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          posts,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalPosts,
            limit: parseInt(limit),
          },
        },
        message: `Retrieved ${posts.length} of your posts successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error.message,
      });
    }
  }
}

module.exports = PostController;
