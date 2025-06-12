const { body } = require('express-validator');

const createPostValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),

  body('category')
    .optional()
    .isIn([
      'technology',
      'lifestyle',
      'business',
      'entertainment',
      'sports',
      'other',
    ])
    .withMessage(
      'Invalid category. Must be one of: technology, lifestyle, business, entertainment, sports, other'
    ),

  body('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string'),

  body('featuredImage')
    .optional()
    .isURL()
    .withMessage('Featured image must be a valid URL'),

  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean value'),
];

const updatePostValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),

  body('content')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),

  body('category')
    .optional()
    .isIn([
      'technology',
      'lifestyle',
      'business',
      'entertainment',
      'sports',
      'other',
    ])
    .withMessage('Invalid category'),

  body('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string'),

  body('featuredImage')
    .optional()
    .isURL()
    .withMessage('Featured image must be a valid URL'),

  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('isPublished must be a boolean value'),
];

module.exports = {
  createPostValidation,
  updatePostValidation,
};
