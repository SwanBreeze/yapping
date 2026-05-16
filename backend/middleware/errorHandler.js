/**
 * errorHandler.js — Global Express Error Handler
 *
 * Express calls this middleware when next(err) is called or when
 * a middleware throws. It must have 4 parameters to be recognized
 * as an error handler by Express.
 */

const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);

  // Multer-specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 25MB.' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
};

module.exports = { errorHandler };
