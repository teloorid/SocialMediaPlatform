const express = require('express');
const PostController = require('../controllers/postController');
const { protect } = require('../middleware/auth'); // Assuming you have this from Day 3
const {
  createPostValidation,
  updatePostValidation,
} = require('../middleware/validation/postValidation');

const router = express.Router();

// Public routes
router.get('/', PostController.getAllPosts);
router.get('/:id', PostController.getPostById);

// Protected routes (require authentication)
router.use(protect); // Apply auth middleware to all routes below

router.get('/user/my-posts', PostController.getMyPosts);
router.post('/', createPostValidation, PostController.createPost);
router.put('/:id', updatePostValidation, PostController.updatePost);
router.delete('/:id', PostController.deletePost);
router.post('/:id/like', PostController.likePost);
router.post('/:id/comment', PostController.addComment);

module.exports = router;
