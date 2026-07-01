// Logs every request: timestamp, method, path, status code, response
// time, and which user made it (if authenticated). This is the simplest
// real form of "observability" - on Render, this shows up directly in
// your service's Logs tab, so you can see exactly what's happening in
// your live app without adding any external tool.
export function requestLogger(req, res, next) {
  const start = Date.now();

  // res.on("finish") fires after the response has been sent - by then,
  // any auth middleware further down the chain has already run and set
  // req.user, even though this logger is registered before those routes.
  res.on("finish", () => {
    const duration = Date.now() - start;
    const userId = req.user?._id || "anonymous";
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms user=${userId}`
    );
  });

  next();
}