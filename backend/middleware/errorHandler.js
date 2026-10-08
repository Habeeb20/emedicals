// 404 for any route that didn't match
export const notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });

// Central error handler: anything passed to next(err) or thrown in an asyncHandler lands here
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON in request body'; }
  else if (err.type === 'entity.too.large') { status = 413; message = 'Request body is too large'; }
  else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}`; }
  else if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyPattern || {})[0] || 'Value'} already exists`;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401; message = 'Invalid or expired token';
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    // never leak internals on a 500 in production
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    ...(process.env.NODE_ENV !== 'production' && status >= 500 && { stack: err.stack }),
  });
};