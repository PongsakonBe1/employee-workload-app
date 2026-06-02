import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { connectDb } from "./db/mongoose.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { workLogsRouter } from "./routes/worklogs.js";
import { statsRouter } from "./routes/stats.js";
import { exportRouter } from "./routes/export.js";
import { notifyRouter } from "./routes/notify.js";

const app = express();

app.use(helmet());
// Allow multiple frontend ports for development
const allowedOrigins = [
  env.clientOrigin,
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Check if origin starts with localhost (any port)
      if (origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "icit-workload-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/worklogs", workLogsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/export", exportRouter);
app.use("/api/notify", notifyRouter);

app.use((req, res) => {
  res
    .status(404)
    .json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

await connectDb();

app.listen(env.port, () => {
  console.log(`API listening at http://localhost:${env.port}`);
});
