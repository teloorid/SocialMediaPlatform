const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Sample users data
const sampleUsers = [
  {
    username: 'johndoe',
    email: 'john@example.com',
    password: 'password123',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Software developer passionate about creating amazing user experiences.',
      location: 'New York, USA',
      website: 'https://johndoe.dev',
    },
    status: {
      isVerified: true,
      emailVerified: true,
    },
  },
  {
    username: 'janedoe',
    email: 'jane@example.com',
    password: 'password123',
    profile: {
      firstName: 'Jane',
      lastName: 'Doe',
      bio: 'UI/UX designer with a love for minimalist design and user-centered solutions.',
      location: 'San Francisco, USA',
      website: 'https://janedesign.com',
    },
    status: {
      isVerified: true,
      emailVerified: true,
    },
  },
  {
    username: 'techguru',
    email: 'guru@example.com',
    password: 'password123',
    profile: {
      firstName: 'Alex',
      lastName: 'Smith',
      bio: 'Tech enthusiast and blogger. Sharing insights about the latest in technology.',
      location: 'Austin, USA',
    },
    status: {
      emailVerified: true,
    },
  },
  {
    username: 'creativemind',
    email: 'creative@example.com',
    password: 'password123',
    profile: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      bio: 'Artist and photographer capturing moments that matter.',
      location: 'Los Angeles, USA',
      website: 'https://sarahcreative.com',
    },
  },
  {
    username: 'devmaster',
    email: 'master@example.com',
    password: 'password123',
    profile: {
      firstName: 'Mike',
      lastName: 'Wilson',
      bio: 'Full-stack developer building the future, one line of code at a time.',
      location: 'Seattle, USA',
    },
    status: {
      emailVerified: true,
    },
  },
];

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for seeding');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Seed Users
const seedUsers = async () => {
  try {
    console.log('Starting databse seeding');

    // Clear existing users (only in development
    if (process.env.NODE_ENV === 'development') {
      await User.deleteMany();
      console.log('Cleared existing users');
    }

    // Create new users
    const createdUsers = await User.create(sampleUsers);
    console.log(`Created ${createdUsers.length} sample users`);

    // Display created users
    createdUsers.forEach((user) => {
      console.log(`${user.username} (${user.email})`);
    });

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding databse:', error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach((key) => {
        console.error(` -${key}: ${error.errors[key].message}`);
      });
    }
  }
};

// Clear all users
const clearUsers = async () => {
  try {
    console.log('Clearing all users');
    const result = await User.deleteMany();
    console.log(`Deleted ${result.deletedCount} users`);
  } catch (error) {
    console.error('Error clearing users', error.message);
  }
};

// Main execution
const main = async () => {
  await connectDB();

  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'seed':
      await seedUsers();
      break;
    case 'clear':
      await clearUsers();
      break;
    case 'reset':
      await clearUsers();
      await seedUsers();
      break;
    default:
      console.log(`
                Usage: node src/utils/seeder.js [command]
                
                Commands:
                seed  - Add sample users to database
                clear  - Remove all users from database
                reset  - Clear and re-seed database`);
  }

  process.exit(0);
};

if (require.main === module) {
  main();
}

module.exports = { seedUsers, clearUsers, sampleUsers };
