// Entry point
import bootstrap, { app } from "./app.controller.js";

// Top-level await ensures DB + Redis are ready before any request is served.
// This works in both local dev (Node 18+) and Vercel serverless (ES modules).
await bootstrap();

// Export the configured Express app for Vercel's @vercel/node runtime.
export default app;
