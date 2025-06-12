const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
require('dotenv').config();

const seedPosts = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        'mongodb://localhost:27017/social_media_platform'
    );

    console.log('🌱 Starting post seeding...');

    // Get existing users
    const users = await User.find().select('_id');

    if (users.length === 0) {
      console.log('❌ No users found. Please run user seeding first.');
      process.exit(1);
    }

    // Clear existing posts
    await Post.deleteMany({});
    console.log('🗑️  Cleared existing posts');

    const samplePosts = [
      {
        title: 'Getting Started with Node.js and Express',
        content:
          "Node.js has revolutionized server-side JavaScript development. In this comprehensive guide, we'll explore how to build robust web applications using Express.js framework. We'll cover routing, middleware, error handling, and best practices for production deployment. Whether you're a beginner or looking to improve your skills, this post will provide valuable insights into modern web development with Node.js.",
        author: users[0]._id,
        category: 'technology',
        tags: ['nodejs', 'express', 'javascript', 'web development'],
        featuredImage:
          'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800',
      },
      {
        title: 'The Future of Remote Work',
        content:
          "The pandemic has fundamentally changed how we think about work. Remote work is no longer just a perk—it's becoming the new normal for many industries. In this post, we explore the benefits and challenges of distributed teams, tools that make remote collaboration effective, and strategies for maintaining work-life balance. Companies that embrace remote work culture are seeing increased productivity and employee satisfaction.",
        author: users[Math.floor(Math.random() * users.length)]._id,
        category: 'business',
        tags: ['remote work', 'productivity', 'work culture', 'digital nomad'],
        featuredImage:
          'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800',
      },
      {
        title: 'Building Healthy Habits That Stick',
        content:
          "Creating lasting change in our lives starts with small, consistent actions. This post explores the science behind habit formation and provides practical strategies for building healthy routines. From morning rituals to exercise habits, we'll discuss how to make positive changes that become second nature. The key is starting small and being consistent rather than trying to change everything at once.",
        author: users[Math.floor(Math.random() * users.length)]._id,
        category: 'lifestyle',
        tags: ['habits', 'health', 'productivity', 'wellness'],
        featuredImage:
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      },
      {
        title: 'The Rise of Sustainable Fashion',
        content:
          "The fashion industry is undergoing a major transformation as consumers become more conscious about environmental impact. Sustainable fashion isn't just a trend—it's a necessary shift towards responsible consumption. This post examines the environmental cost of fast fashion, highlights innovative sustainable brands, and provides tips for building a more conscious wardrobe. Small changes in our shopping habits can make a significant impact.",
        author: users[Math.floor(Math.random() * users.length)]._id,
        category: 'lifestyle',
        tags: ['fashion', 'sustainability', 'environment', 'conscious living'],
        featuredImage:
          'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
      },
      {
        title: 'Mastering Database Design Patterns',
        content:
          "Effective database design is crucial for building scalable applications. This comprehensive guide covers essential database design patterns, normalization techniques, and performance optimization strategies. We'll explore different database types—relational, document, and graph databases—and when to use each. Understanding these concepts will help you make better architectural decisions and avoid common pitfalls in data modeling.",
        author: users[Math.floor(Math.random() * users.length)]._id,
        category: 'technology',
        tags: ['database', 'sql', 'mongodb', 'design patterns'],
        featuredImage:
          'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800',
      },
      {
        title: 'The Psychology of Investing',
        content:
          "Successful investing isn't just about picking the right stocks—it's about managing your emotions and cognitive biases. This post explores behavioral finance principles and how psychological factors influence investment decisions. We'll discuss common biases like loss aversion and confirmation bias, and provide strategies for making more rational investment choices. Understanding the psychology behind investing can significantly improve your financial outcomes.",
        author: users[Math.floor(Math.random() * users.length)]._id,
        category: 'business',
        tags: ['investing', 'psychology', 'finance', 'behavioral economics'],
        featuredImage:
          'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800',
      },
      {
        title: 'Exploring Machine Learning Fundamentals',
        content:
          "Machine learning is transforming industries and creating new possibilities in technology. This beginner-friendly guide introduces core ML concepts including supervised learning, unsupervised learning, and neural networks. We'll explore practical applications, discuss popular frameworks like TensorFlow and PyTorch, and provide guidance on getting started with your first ML project. The field may seem complex, but with the right foundation, anyone can begin their ML journey.",
        author: users[Math.floor(Math.random() * users.length)]._id,
        category: 'technology',
        tags: ['machine learning', 'ai', 'python', 'data science'],
        featuredImage:
          'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800',
      },
      {
        title: 'The Art of Minimalist Living',
        content:
          "Minimalism isn't about having less—it's about making room for more of what matters. This post explores the principles of minimalist living and how reducing physical clutter can lead to mental clarity and increased focus. We'll discuss practical decluttering strategies, the psychology behind our attachment to possessions, and how minimalism can improve both your living space and your mindset. Start small and gradually embrace a more intentional way of living.",
        author: users[Math.floor(Math.random() * users.length)]._id,
        category: 'lifestyle',
        tags: ['minimalism', 'decluttering', 'mindfulness', 'simple living'],
        featuredImage:
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
      },
    ];

    // Create posts
    const createdPosts = await Post.insertMany(samplePosts);
    console.log(`✅ Created ${createdPosts.length} sample posts`);

    // Add some likes and comments to make it realistic
    for (let post of createdPosts) {
      // Add random likes
      const likeCount = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < likeCount; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        if (
          !post.likes.some(
            (like) => like.user.toString() === randomUser._id.toString()
          )
        ) {
          post.likes.push({ user: randomUser._id });
        }
      }

      // Add random comments
      const commentTexts = [
        'Great post! Thanks for sharing.',
        'This is exactly what I was looking for!',
        'Really insightful content. Keep it up!',
        'I have a different perspective on this topic.',
        'Thanks for the detailed explanation.',
        'Could you elaborate more on this point?',
        'Bookmarked for future reference!',
        'This helped me understand the concept better.',
      ];

      const commentCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < commentCount; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomComment =
          commentTexts[Math.floor(Math.random() * commentTexts.length)];
        post.comments.push({
          user: randomUser._id,
          content: randomComment,
        });
      }

      await post.save();
    }

    console.log('🎉 Post seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Posts created: ${createdPosts.length}`);
    console.log(`   - Categories: technology, business, lifestyle`);
    console.log(`   - Features: likes, comments, tags, categories`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding posts:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedPosts();
}

module.exports = seedPosts;
