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

// Public routes
router.get('/stats', getUserStats); // Statistics route (must be before /:id route)
router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;