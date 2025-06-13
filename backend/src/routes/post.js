const express = require('express');
const {
  getAllPosts,
  getPostById,
  getMyPosts,
  createPost,
  updatePost,
  deletePost,
  likePost,
  addComment,
  getPostLikes,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const {
  createPostValidation,
  updatePostValidation,
} = require('../middleware/validation/postValidation');

const router = express.Router();

// Public routes
router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.get('/:id/likes', getPostLikes);

// Protected routes
router.use(protect); // All routes after this are protected

router.get('/user/my-posts', getMyPosts);
router.post('/', createPostValidation, createPost);
router.put('/:id', updatePostValidation, updatePost);
router.delete('/:id', deletePost);
router.post('/:id/like', likePost);
router.post('/:id/comment', addComment);

module.exports = router;
