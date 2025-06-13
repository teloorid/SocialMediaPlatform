const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');

const seedComments = async () => {
  try {
    console.log('Starting comment seeding...');

    // Clear existing comments first (optional)
    // await Comment.deleteMany({});
    // console.log('Cleared existing comments');

    // Get sample users and posts
    const users = await User.find().limit(5);
    const posts = await Post.find().limit(3);

    if (users.length === 0) {
      console.log('❌ No users found. Please create users first');
      return;
    }

    if (posts.length === 0) {
      console.log('❌ No posts found. Please create posts first');
      return;
    }

    console.log(`Found ${users.length} users and ${posts.length} posts`);

    // Create sample comments with more variety
    const commentsData = [
      {
        content:
          'Great post! Really insightful content that made me think differently about this topic.',
        author: users[0]._id,
        post: posts[0]._id,
      },
      {
        content:
          'I learned a lot from this. Thanks for sharing your expertise!',
        author: users[1]._id,
        post: posts[0]._id,
      },
      {
        content:
          'Interesting perspective on this topic. Would love to hear more thoughts.',
        author: users[2]._id,
        post: posts[1]._id,
      },
      {
        content:
          'This is exactly what I was looking for. Bookmarking this for later reference.',
        author: users[0]._id,
        post: posts[1]._id,
      },
    ];

    // Add more comments if we have more posts
    if (posts.length > 2) {
      commentsData.push({
        content: 'Well written and easy to understand. Keep up the great work!',
        author: users[1]._id,
        post: posts[2]._id,
      });
    }

    // Create comments one by one to ensure proper middleware execution
    const createdComments = [];
    for (const commentData of commentsData) {
      try {
        const comment = new Comment(commentData);
        const savedComment = await comment.save();
        createdComments.push(savedComment);

        // Update post comment count
        await Post.findByIdAndUpdate(commentData.post, {
          $inc: { commentCount: 1 },
        });

        console.log(
          `✅ Created comment: "${commentData.content.substring(0, 30)}..."`
        );
      } catch (error) {
        console.error(`❌ Failed to create comment: ${error.message}`);
      }
    }

    // Create some replies (nested comments)
    const repliesData = [
      {
        content:
          'Thanks! Glad you found it helpful. Feel free to share your own thoughts too.',
        author: users[3] ? users[3]._id : users[0]._id,
        post: posts[0]._id,
        parentComment: createdComments[0]._id,
      },
      {
        content:
          "You're welcome! If you have any questions, don't hesitate to ask.",
        author: users[2]._id,
        post: posts[0]._id,
        parentComment: createdComments[1]._id,
      },
      {
        content: 'I agree with your point about the practical applications.',
        author: users[4] ? users[4]._id : users[1]._id,
        post: posts[1]._id,
        parentComment: createdComments[2]._id,
      },
    ];

    // Create replies one by one
    const createdReplies = [];
    for (const replyData of repliesData) {
      try {
        const reply = new Comment(replyData);
        const savedReply = await reply.save();
        createdReplies.push(savedReply);

        // Update post comment count for replies too
        await Post.findByIdAndUpdate(replyData.post, {
          $inc: { commentCount: 1 },
        });

        console.log(
          `✅ Created reply: "${replyData.content.substring(0, 30)}..."`
        );
      } catch (error) {
        console.error(`❌ Failed to create reply: ${error.message}`);
      }
    }

    // Add some likes to comments
    const likesToAdd = [
      { commentId: createdComments[0]._id, userId: users[1]._id },
      { commentId: createdComments[0]._id, userId: users[2]._id },
      { commentId: createdComments[1]._id, userId: users[0]._id },
      {
        commentId: createdComments[2]._id,
        userId: users[3] ? users[3]._id : users[0]._id,
      },
    ];

    for (const like of likesToAdd) {
      try {
        const comment = await Comment.findById(like.commentId);
        if (comment) {
          // Check if user hasn't already liked this comment
          const alreadyLiked = comment.likes.some(
            (l) => l.user.toString() === like.userId.toString()
          );

          if (!alreadyLiked) {
            await Comment.findByIdAndUpdate(like.commentId, {
              $push: { likes: { user: like.userId } },
              $inc: { likeCount: 1 },
            });
            console.log(`✅ Added like to comment`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to add like: ${error.message}`);
      }
    }

    // Get final counts
    const totalComments = await Comment.countDocuments();
    const totalReplies = await Comment.countDocuments({
      parentComment: { $ne: null },
    });
    const totalLikes = await Comment.aggregate([
      { $group: { _id: null, totalLikes: { $sum: '$likeCount' } } },
    ]);

    console.log('\n🎉 Comment seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Total comments: ${totalComments}`);
    console.log(`   - Replies: ${totalReplies}`);
    console.log(`   - Total likes: ${totalLikes[0]?.totalLikes || 0}`);
    console.log(`   - Top-level comments: ${totalComments - totalReplies}`);
  } catch (error) {
    console.error('❌ Error seeding comments:', error);
    throw error;
  }
};

// Function to clear all comments (useful for development)
const clearComments = async () => {
  try {
    await Comment.deleteMany({});
    // Reset comment counts in posts
    await Post.updateMany({}, { commentCount: 0 });
    console.log('✅ All comments cleared and post counts reset');
  } catch (error) {
    console.error('❌ Error clearing comments:', error);
    throw error;
  }
};

module.exports = { seedComments, clearComments };
