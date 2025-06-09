const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: {
      health: 'GET /health',
      api: 'GET /api/v1/*',
      docs: 'GET /api/v1/docs',
    },
  });
};

module.exports = notFound;
