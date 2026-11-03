import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function devApi() {
  return {
    name: "twentyq-dev-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      for (const [key, value] of Object.entries(env)) {
        if (key.startsWith("GEMINI_") && !(key in process.env)) process.env[key] = value;
      }

      server.middlewares.use("/api/generate", async (req, res) => {
        let raw = "";
        for await (const chunk of req) raw += chunk;
        try {
          req.body = raw ? JSON.parse(raw) : {};
        } catch {
          req.body = {};
        }

        // Minimal helpers matching the Vercel response API
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (payload) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        };

        try {
          const mod = await server.ssrLoadModule("/api/generate.js");
          await mod.default(req, res);
        } catch (err) {
          res.status(500).json({ error: `Local API error: ${err.message}` });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
});
