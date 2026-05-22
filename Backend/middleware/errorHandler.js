function errorHandler(err, req, res, next) {
  console.error('[Unhandled Error]', err.message);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
}

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

module.exports = { errorHandler, notFound };
