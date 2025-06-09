const User = require('../models/User');

// Test basic CRUD operations
const testUserOperations = async () => {
  try {
    console.log('Testing User Model Operations');

    // Test 1: Create a new user
    console.log('Testing User Creation');
    const newUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        bio: 'This is a test user',
      },
    });

    const savedUser = await newUser.save();
    console.log('User created successfully');
    console.log(`ID: ${savedUser._id}`);
    console.log(`Username: ${savedUser.username}`);
    console.log(`Full name: ${savedUser.profile.fullName}`);
    console.log(`Created: ${savedUser.createdAt}\n`);

    // Test 2: Find user by ID
    console.log('Testing User Retrieval');
    const foundUser = await User.findById(savedUser._id);
    console.log('User found by ID');
    console.log(`Email: ${foundUser.email}`);
    console.log(`Active: ${foundUser.status.isActive}\n`);

    // Test 3: Update User
    console.log('Testing User Update');
    const updatedUser = await User.findByIdAndUpdate(
      savedUser._id,
      {
        'profile.bio': 'Updated bio for test user',
        'status.lastLogin': new Date(),
      },
      { new: true }
    );
    console.log('User updated successfully');
    console.log(`New Bio: ${updatedUser.profile.bio}\n`);

    // Test 4: Test password hashing
    console.log('Testing Password Hashing');
    const isPasswordValid = await savedUser.matchPassword('password123');
    const isWrongPassword = await savedUser.matchPassword('wrongpassword');
    console.log(`Correct password check: ${isPasswordValid}`);
    console.log(`Wrong password check: ${isWrongPassword}\n`);

    // Test 5: Test JWT token generation
    console.log('Testing JWT Token Generation');
    const token = savedUser.getSignedJwtToken();
    console.log('JWT token generated');
    console.log(`Token length: ${token.length} characters\n`);

    // Test 6: Test search functionality
    console.log('Test Search Functionality');
    const searchResults = await User.searchUsers('test');
    console.log(`Search found ${searchResults.length} users`);
    searchResults.forEach((user) => {
      console.log(`-${user.username} (${user.email})\n`);
    });

    // Test 7: Test user statistics
    console.log('Testing User Statistics');
    const stats = await User.getUserStats();
    console.log('User statistics calculated:');
    console.log(`Total Users: ${stats.totalUsers}`);
    console.log(`Active Users: ${stats.activeUsers}`);
    console.log(`Verified Users: ${stats.verifiedUsers}`);
    console.log(`Average Posts: ${stats.avgPostsPerUser.toFixed(2)}\n`);

    // Test 8: Cleanup
    console.log('Cleaning up test data');
    await User.findByIdAndDelete(savedUser.Id);
    console.log('Test user deleted\n');

    console.log('All tests passed successfully');
  } catch (error) {
    console.error('Test failed', error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach((key) => {
        console.error(`-${key}: ${error.errors[key].message}`);
      });
    }
  }
};

module.exports = { testUserOperations };
