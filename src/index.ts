// Development server only — production is the static build in dist/ (`bun run build`).
import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
