import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/icit_workload",
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("JWT_SECRET env var is required in production"); })()
    : "dev-secret-change-me"),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}",
  cronSecret: process.env.CRON_SECRET || (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("CRON_SECRET env var is required in production"); })()
    : "dev-cron-secret"),
};
