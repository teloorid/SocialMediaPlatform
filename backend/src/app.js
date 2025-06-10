const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();

// Custom MongoDB sanitization middleware (replacement for express-mongo-sanitize)
const sanitizeMiddleware = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item) => sanitize(item));
    }
    return obj;
  };

  // XSS sanitization
  const xssSanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    } else if (obj && typeof obj === 'object' && obj.constructor === Object) {
      for (const key in obj) {
        if (obj[key] !== null) {
          obj[key] = xssSanitize(obj[key]);
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        obj[index] = xssSanitize(item);
      });
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitize(JSON.parse(JSON.stringify(req.body)));
    req.body = xssSanitize(req.body);
  }

  // Sanitize query parameters - create a new object instead of modifying
  if (req.query && Object.keys(req.query).length > 0) {
    const sanitizedQuery = sanitize(JSON.parse(JSON.stringify(req.query)));
    req.sanitizedQuery = xssSanitize(sanitizedQuery);
    // Override the query getter to return our sanitized version
    Object.defineProperty(req, 'query', {
      value: req.sanitizedQuery,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  // Sanitize route parameters
  if (req.params) {
    req.params = sanitize(JSON.parse(JSON.stringify(req.params)));
    req.params = xssSanitize(req.params);
  }

  next();
};

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later',
  },
});
app.use(limiter);

// CORS Configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://mydomain.com']
        : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization
app.use(sanitizeMiddleware); // Against NoSQl query injection
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Trust proxy
app.set('trust proxy', 1);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'Success',
    message: 'Server is running smoothly',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
app.use('api/v1', (req, res, next) => {
  res.header('API-Version', '1.0.0');
  next();
});

// Routes
// Welcome Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'Success',
    message:
      'Welcome to Social Media Platform API!The server is running with patched sanitization',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    health: '/health',
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Error handling middleware
// Handle 404 errors
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Connect to MongoDB and start server
const connectDB = require('./config/database');
connectDB();

module.exports = app;
