/**
 * Lightweight structured HTTP request logger middleware.
 * Measures response duration and prints structured request logs.
 */
export function requestLogger(req, res, next) {
  const startTime = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const timeInMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;

    // Status level indicator
    let statusLabel = `[${statusCode}]`;
    if (statusCode >= 500) {
      statusLabel = `\x1b[31m[${statusCode}]\x1b[0m`; // Red
    } else if (statusCode >= 400) {
      statusLabel = `\x1b[33m[${statusCode}]\x1b[0m`; // Yellow
    } else if (statusCode >= 300) {
      statusLabel = `\x1b[36m[${statusCode}]\x1b[0m`; // Cyan
    } else {
      statusLabel = `\x1b[32m[${statusCode}]\x1b[0m`; // Green
    }

    console.log(`[HTTP] ${method.padEnd(6)} ${statusLabel} ${url} (${timeInMs}ms)`);
  });

  next;
  next();
}
