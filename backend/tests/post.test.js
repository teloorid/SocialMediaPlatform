const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Post = require('../src/models/Post');
const User = require('../src/models/User');
const connectDB = require('../src/config/database');

describe('Post API', () => {
  let authToken;
  let refreshToken;
  let userId;
  let postId;
  let secondUserToken;
  let secondUserRefreshToken;
  let secondUserId;

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
  }, 30000);

  beforeEach(async () => {
    // Clear test data before each test suite
    await User.deleteMany({});
    await Post.deleteMany({});

    console.log('Creating test users...');

    // Create test users
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
    });

    const secondUser = await User.create({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'Password123!',
    });

    userId = testUser._id;
    secondUserId = secondUser._id;

    console.log('Users created, attempting login...');

    // Get auth tokens - Fixed rememberMe as boolean
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({
        username: 'testuser',
        password: 'Password123!',
      });

    const secondLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send({
        username: 'testuser2',
        password: 'Password123!',
      });

    // Add debugging and validation
    console.log('Login response status:', loginResponse.status);
    console.log(
      'Login response body:',
      JSON.stringify(loginResponse.body, null, 2)
    );
    console.log('Second login response status:', secondLoginResponse.status);
    console.log(
      'Second login response body:',
      JSON.stringify(secondLoginResponse.body, null, 2)
    );

    // If validation failed, log the detailed errors
    if (loginResponse.status !== 200) {
      console.log('Login failed - detailed error:', loginResponse.body);
      // If there are validation errors, show them
      if (loginResponse.body.data) {
        console.log('Validation errors:', loginResponse.body.data);
      }
    }

    if (secondLoginResponse.status !== 200) {
      console.log('Login failed - detailed error:', secondLoginResponse.body);
      // If there are validation errors, show them
      if (secondLoginResponse.body.data) {
        console.log('Validation errors:', secondLoginResponse.body.data);
      }
    }

    // Validate login responses
    expect(loginResponse.status).toBe(200);
    expect(secondLoginResponse.status).toBe(200);

    // Extract tokens and refresh tokens
    authToken = loginResponse.body.data.accessToken;
    refreshToken = loginResponse.body.data.refreshToken;
    secondUserToken = secondLoginResponse.body.data.accessToken;
    secondUserRefreshToken = secondLoginResponse.body.data.refreshToken;

    // Validate tokens exist
    expect(authToken).toBeDefined();
    expect(refreshToken).toBeDefined();
    expect(secondUserToken).toBeDefined();
    expect(secondUserRefreshToken).toBeDefined();

    console.log('Auth token:', authToken);
    console.log('Second user token:', secondUserToken);
  }, 15000);

  afterAll(async () => {
    // Final cleanup
    await User.deleteMany({});
    await Post.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/v1/posts', () => {
    test('Should create a new post with valid data', async () => {
      const newPost = {
        title: 'Test Post Title',
        content:
          'This is a test post content that meets the minimum length requirement.',
        category: 'technology',
        tags: 'nodejs,testing,api',
      };

      console.log(
        'Creating post with token:',
        authToken ? 'Present' : 'Missing'
      );

      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(newPost);

      console.log('Post creation response status:', response.status);
      console.log('Post creation response body:', response.body);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(newPost.title);
      expect(response.body.data.content).toBe(newPost.content);
      expect(response.body.data.author._id).toBe(userId.toString());
      expect(response.body.data.tags).toEqual(['nodejs', 'testing', 'api']);

      // Store for other tests in this describe block
      postId = response.body.data._id;
    }, 10000);

    test('Should fail to create post without authentication', async () => {
      const newPost = {
        title: 'Test Post Title',
        content:
          'This is a test post content that meets the minimum length requirement.',
      };

      const response = await request(app)
        .post('/api/v1/posts')
        .set('Content-Type', 'application/json')
        .send(newPost);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    }, 10000);

    test('Should fail with invalid data - title too short', async () => {
      const invalidPost = {
        title: 'A', // Too short (less than 3 characters)
        content:
          'This is a valid content that meets the minimum length requirement of 10 characters.',
        category: 'technology',
      };

      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(invalidPost);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    }, 10000);

    test('Should fail with invalid data - content too short', async () => {
      const invalidPost = {
        title: 'Valid Title Here',
        content: 'Short', // Too short (less than 10 characters)
        category: 'technology',
      };

      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(invalidPost);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    }, 10000);

    test('Should fail with missing required fields', async () => {
      const incompletePost = {
        title: 'Test Post Title',
        // Missing content
      };

      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(incompletePost);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    }, 10000);

    test('Should handle XSS attempts in post content', async () => {
      const maliciousPost = {
        title: '<script>alert("xss")</script>Test Title',
        content:
          '<script>alert("xss")</script>This is malicious content that meets the minimum length requirement.',
        category: 'technology',
      };

      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(maliciousPost);

      // This test depends on your XSS sanitization implementation
      // If you don't have XSS sanitization, the post will be created as-is
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        // Check if XSS was sanitized (depends on your implementation)
        // If you have sanitization: expect(response.body.data.title).not.toContain('<script>');
        // If you don't have sanitization: expect(response.body.data.title).toContain('<script>');
      }
    }, 10000);

    test('Should create post with valid category', async () => {
      const postWithCategory = {
        title: 'Technology Post',
        content:
          'This is a technology-related post that meets the minimum length requirement.',
        category: 'technology',
      };

      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(postWithCategory);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('technology');
    }, 10000);

    test('Should fail with invalid category', async () => {
      const postWithInvalidCategory = {
        title: 'Test Post Title',
        content:
          'This is a test post content that meets the minimum length requirement.',
        category: 'invalid-category', // Not in allowed list
      };

      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(postWithInvalidCategory);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    }, 10000);

    test('Should create post with default category when not provided', async () => {
      const postWithoutCategory = {
        title: 'Test Post Title',
        content:
          'This is a test post content that meets the minimum length requirement.',
      };

      const response = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(postWithoutCategory);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('other'); // Default category
    });
  }, 10000);

  describe('GET /api/v1/posts', () => {
    beforeEach(async () => {
      // Create test posts for these tests
      await Post.create({
        title: 'Technology Post',
        content: 'This is a technology post content that meets requirements.',
        category: 'technology',
        author: userId,
        tags: ['tech', 'nodejs'],
      });

      await Post.create({
        title: 'Lifestyle Post',
        content: 'This is a lifestyle post content that meets requirements.',
        category: 'lifestyle',
        author: secondUserId,
        tags: ['life', 'health'],
      });
    }, 15000);

    test('Should get all posts with pagination', async () => {
      const response = await request(app).get('/api/v1/posts').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toBeInstanceOf(Array);
      expect(response.body.data.posts.length).toBeGreaterThanOrEqualTo(0);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
    }, 10000);

    test('Should filter posts by category', async () => {
      const response = await request(app)
        .get('/api/v1/posts?category=technology')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.posts.forEach((post) => {
        expect(post.category).toBe('technology');
      });
    }, 10000);

    test('Should search posts by title and content', async () => {
      const response = await request(app)
        .get('/api/v1/posts?search=technology')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts.length).toBeGreaterThanOrEqualTo(0);
    }, 10000);

    test('Should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/posts?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts.length).toBeLessThanOrEqual(1);
      expect(response.body.data.pagination.limit).toBe(1);
    }, 10000);

    test('Should sort posts by creation date (newest first)', async () => {
      const response = await request(app)
        .get('/api/v1/posts?sort=-createdAt')
        .expect(200);

      expect(response.body.success).toBe(true);
      const posts = response.body.data.posts;
      if (posts.length > 1) {
        const firstPostDate = new Date(posts[0].createdAt);
        const secondPostDate = new Date(posts[1].createdAt);
        expect(firstPostDate.getTime()).toBeGreaterThanOrEqual(
          secondPostDate.getTime()
        );
      }
    }, 10000);
  });

  describe('GET /api/v1/posts/:id', () => {
    let testPostId;

    beforeEach(async () => {
      const testPost = await Post.create({
        title: 'Test Single Post',
        content: 'This is content for testing single post retrieval.',
        category: 'technology',
        author: userId,
      });
      testPostId = testPost._id;
    });

    test('Should get a single post by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/posts/${testPostId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testPostId.toString());
      expect(response.body.data.author).toBeDefined();
    }, 10000);

    test('Should return 404 for non-existent post', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/posts/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Post not found');
    });

    test('Should return 400 for invalid post ID', async () => {
      const response = await request(app)
        .get('/api/v1/posts/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid Post ID');
    });
  }, 10000);

  describe('PUT /api/v1/posts/:id', () => {
    let testPostId;

    beforeEach(async () => {
      const testPost = await Post.create({
        title: 'Original Title',
        content: 'Original content for testing updates.',
        category: 'technology',
        author: userId,
      });
      testPostId = testPost._id;
    });

    test('Should update own post', async () => {
      const updateData = {
        title: 'Updated Test Post Title',
        content: 'This is the updated content for the test post.',
      };

      const response = await request(app)
        .put(`/api/v1/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.content).toBe(updateData.content);
    }, 10000);

    test("Should fail to update another user's post", async () => {
      const updateData = {
        title: 'Unauthorized Update',
        content: 'This should not be allowed.',
      };

      const response = await request(app)
        .put(`/api/v1/posts/${testPostId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authorization Error');
    }, 10000);

    test('Should fail to update with invalid data', async () => {
      const invalidData = {
        title: 'A', // Too short
        content: 'Short', // Too short
      };

      const response = await request(app)
        .put(`/api/v1/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    }, 10000);
  });

  describe('POST /api/v1/posts/:id/like', () => {
    let testPostId;

    beforeEach(async () => {
      const testPost = await Post.create({
        title: 'Post to Like',
        content: 'This post will be liked and unliked.',
        category: 'technology',
        author: userId,
      });
      testPostId = testPost._id;
    });

    test('Should like a post', async () => {
      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isLiked).toBe(true);
      expect(response.body.data.likeCount).toBe(1);
    }, 10000);

    test('Should unlike a post when liked again', async () => {
      // First like
      await request(app)
        .post(`/api/v1/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(200);

      // Then unlike
      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isLiked).toBe(false);
      expect(response.body.data.likeCount).toBe(0);
    }, 10000);

    test('Should fail to like own post', async () => {
      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    }, 10000);
  });

  describe('POST /api/v1/posts/:id/comment', () => {
    let testPostId;

    beforeEach(async () => {
      const testPost = await Post.create({
        title: 'Post for Comments',
        content: 'This post will receive comments.',
        category: 'technology',
        author: userId,
      });
      testPostId = testPost._id;
    });

    test('Should add a comment to a post', async () => {
      const comment = {
        content: 'This is a test comment on the post.',
      };

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/comment`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send(comment)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.commentCount).toBe(1);
      expect(response.body.data.post.comments[0].content).toBe(comment.content);
      expect(response.body.data.post.comments[0].author._id).toBe(
        secondUserId.toString()
      );
    }, 10000);

    test('Should fail to add empty comment', async () => {
      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/comment`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ content: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    test('Should fail to add comment without authentication', async () => {
      const comment = {
        content: 'This comment should fail.',
      };

      const response = await request(app)
        .post(`/api/v1/posts/${testPostId}/comment`)
        .send(comment)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/posts/user/my-posts', () => {
    beforeEach(async () => {
      // Create posts for the authenticated user
      await Post.create({
        title: 'My First Post',
        content: 'Content of my first post.',
        category: 'technology',
        author: userId,
      });

      await Post.create({
        title: 'My Second Post',
        content: 'Content of my second post.',
        category: 'lifestyle',
        author: userId,
      });

      // Create a post by another user
      await Post.create({
        title: 'Other User Post',
        content: 'Content by another user.',
        category: 'technology',
        author: secondUserId,
      });
    });

    test("Should get user's own posts", async () => {
      const response = await request(app)
        .get('/api/v1/posts/user/my-posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toBeInstanceOf(Array);
      expect(response.body.data.posts.length).toBe(2);

      // All posts should belong to the authenticated user
      response.body.data.posts.forEach((post) => {
        expect(post.author.toString()).toBe(userId.toString());
      });
    });

    test('Should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/posts/user/my-posts')
        .expect(401);

      expect(response.body.success).toBe(false);
    }, 10000);
  });

  describe('DELETE /api/v1/posts/:id', () => {
    let testPostId;

    beforeEach(async () => {
      const testPost = await Post.create({
        title: 'Post to Delete',
        content: 'This post will be deleted.',
        category: 'technology',
        author: userId,
      });
      testPostId = testPost._id;
    });

    test("Should fail to delete another user's post", async () => {
      const response = await request(app)
        .delete(`/api/v1/posts/${testPostId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authorization Error');
    });

    test('Should delete own post', async () => {
      const response = await request(app)
        .delete(`/api/v1/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Post deleted successfully');
    });

    test('Should return 404 when trying to get deleted post', async () => {
      // First delete the post
      await request(app)
        .delete(`/api/v1/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Then try to get it
      const response = await request(app)
        .get(`/api/v1/posts/${testPostId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('Should fail to delete non-existent post', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/v1/posts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('Should require authentication to delete', async () => {
      const response = await request(app)
        .delete(`/api/v1/posts/${testPostId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
