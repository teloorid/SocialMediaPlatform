const express = require('express');
const {
  createComment,
  getPostComments,
  getCommentReplies,
  updateComment,
  deleteComment,
  likeComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const {
  validateCreateComment,
  validateUpdateComment,
  validateCommentId,
  validateGetPostComments,
  validateGetCommentReplies,
} = require('../middleware/validation/commentValidation');

const router = express.Router();

// Public routes
router.get(
  '/v1/posts/:postId/comments',
  validateGetPostComments,
  getPostComments
);
router.get(
  '/v1/comments/:commentId/replies',
  validateGetCommentReplies,
  getCommentReplies
);

// Protected routes
router.use(protect); // All routes after this are protected

router.post('/v1/posts/:postId/comments', validateCreateComment, createComment);
router.put('/v1/comments/:commentId', validateUpdateComment, updateComment);
router.delete('/v1/comments/:commentId', validateCommentId, deleteComment);
router.post('/v1/comments/:commentId/like', validateCommentId, likeComment);

module.exports = router;
