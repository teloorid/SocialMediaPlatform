const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
} = require('../controllers/userController');

const router = express.Router();

// Statistics route (must be before /:id route)
router.route('/stats').get(getUserStats);

// Main user routes
router.route('/').get(getUsers).post(createUser);

router.route('/:id').get(getUser).put(updateUser).delete(deleteUser);

module.exports = router;
