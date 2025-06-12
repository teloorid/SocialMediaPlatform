const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const connectDB = require('../src/config/database');

describe('Authentication Endpoints', () => {
  let server;

  beforeAll(async () => {
    // Set test environment if not already set
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'test';
    }

    // Ensure clean connection state
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    // Use your existing connectDB function
    await connectDB();

    // Start the server
    server = app.listen(5001);

    console.log('Test setup completed - Database and server ready');
  }, 30000); // Increase timeout to 30 seconds

  afterAll(async () => {
    try {
      // Clean up test data
      if (mongoose.connection.readyState === 1) {
        await User.deleteMany({});
      }

      // Close database connection
      await mongoose.connection.close();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }

    if (server) {
      await server.close();
      console.log('Server closed');
    }
  });

  beforeEach(async () => {
    // Ensure connection is ready before cleanup
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not ready');
    }

    // Clean up data before each test
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    const validUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(validUser.email);
      expect(response.body.data.user.username).toBe(validUser.username);
      expect(response.body.data.accessToken).toBeDefined();
    }, 10000);

    it('should not register user with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not register user with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          password: '123',
          confirmPassword: '123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not register user with mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          password: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not register user with duplicate email', async () => {
      // Create user directly in database first
      await User.create({
        username: 'existinguser',
        email: validUser.email,
        password: validUser.password,
        profile: {
          firstName: 'Existing',
          lastName: 'User',
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not register user with duplicate username', async () => {
      // Create user directly in database first
      await User.create({
        username: validUser.username,
        email: 'different@example.com',
        password: validUser.password,
        profile: {
          firstName: 'Existing',
          lastName: 'User',
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          email: 'another@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let user;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
        status: {
          emailVerified: true, // Ensure email is verified if required
        },
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should login with email instead of username', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'test@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should login with remember me option', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123!',
          rememberMe: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not login with missing username', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'Password123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not login with missing password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let user;
    let token;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      });
      token = user.getSignedJwtToken();
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(user.email);
    });

    it('should not get current user without token', async () => {
      const response = await request(app).get('/api/v1/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not get current user with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let user;
    let token;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      });
      token = user.getSignedJwtToken();
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should logout with refresh token', async () => {
      const refreshToken = user.generateRefreshToken();
      await user.save();

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not logout without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout-all', () => {
    let user;
    let token;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      });
      token = user.getSignedJwtToken();
    });

    it('should logout from all devices successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Logged out from all sessions successfully'
      );
    });

    it('should not logout from all devices without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout-all')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/auth/me', () => {
    let user;
    let token;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      });
      token = user.getSignedJwtToken();
    });

    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'This is my updated bio',
        location: 'New York, NY',
      };

      const response = await request(app)
        .put('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.firstName).toBe(updateData.firstName);
      expect(response.body.data.profile.lastName).toBe(updateData.lastName);
    });

    it('should not update profile without authentication', async () => {
      const response = await request(app)
        .put('/api/v1/auth/me')
        .send({ firstName: 'Updated' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/auth/password', () => {
    let user;
    let token;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      });
      token = user.getSignedJwtToken();
    });

    it('should update password successfully', async () => {
      const passwordData = {
        currentPassword: 'Password123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      const response = await request(app)
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password updated successfully');
    });

    it('should not update password with wrong current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      const response = await request(app)
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not update password with mismatched new passwords', async () => {
      const passwordData = {
        currentPassword: 'Password123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
      };

      const response = await request(app)
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    let user;
    let refreshToken;

    beforeEach(async () => {
      user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      });
      refreshToken = user.generateRefreshToken();
      await user.save();
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should not refresh token without refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not refresh token with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
