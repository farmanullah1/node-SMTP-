/**
 * Asynchronous handler wrapper to eliminate repetitive try-catch blocks
 * in Express controllers.
 * 
 * In Express 4, unhandled promise rejections inside async route handlers
 * do not automatically propagate to the next(err) middleware, which can
 * lead to hung requests and unhandledRejection events.
 * 
 * This higher-order function catches any rejected Promise and passes
 * the error forward to Express's next() function.
 * 
 * @param {Function} fn - Async controller function (req, res, next)
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
