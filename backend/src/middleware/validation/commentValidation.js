const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// Validate MongoDB ObjectId
const validateObjectId = (field, fieldName) => {
  return param(field)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`Invalid ${fieldName} ID format`);
      }
      return true;
    })
    .withMessage(`${fieldName} ID must be a valid MongoDB ObjectId`);
};

// Validate comment content
const validateCommentContent = () => {
  return [
    body('content')
      .notEmpty()
      .withMessage('Comment content is required')
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment content must be between 1 and 1000 characters')
      .trim()
      .escape(), // Sanitize HTML entities
  ];
};

// Validate parent comment (for replies)
const validateParentComment = () => {
  return [
    body('parentComment')
      .optional()
      .custom((value) => {
        if (value && !mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid parent comment ID format');
        }
        return true;
      })
      .withMessage('Parent comment ID must be a valid MongoDB ObjectId'),
  ];
};

// Main validation middleware for creating comments
const validateCreateComment = [
  validateObjectId('postId', 'Post'),
  ...validateCommentContent(),
  ...validateParentComment(),
  handleValidationErrors,
];

// Validation middleware for updating comments
const validateUpdateComment = [
  validateObjectId('commentId', 'Comment'),
  ...validateCommentContent(),
  handleValidationErrors,
];

// Validation middleware for comment ID parameters
const validateCommentId = [
  validateObjectId('commentId', 'Comment'),
  handleValidationErrors,
];

// Validation middleware for post ID parameters
const validatePostId = [
  validateObjectId('postId', 'Post'),
  handleValidationErrors,
];

// Validation middleware for getting post comments (with optional query params)
const validateGetPostComments = [
  validateObjectId('postId', 'Post'),
  // Optional query parameters for pagination and sorting
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  body('sort')
    .optional()
    .isIn(['newest', 'oldest', 'likes'])
    .withMessage('Sort must be one of: newest, oldest, likes'),
  handleValidationErrors,
];

// Validation middleware for getting comment replies
const validateGetCommentReplies = [
  validateObjectId('commentId', 'Comment'),
  // Optional query parameters for pagination
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  handleValidationErrors,
];

module.exports = {
  validateCreateComment,
  validateUpdateComment,
  validateCommentId,
  validatePostId,
  validateGetPostComments,
  validateGetCommentReplies,
  validateCommentContent,
  validateParentComment,
  handleValidationErrors,
};
