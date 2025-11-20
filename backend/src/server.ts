import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth";
import stockRoutes from "./routes/stocks";
import notificationRoutes from "./routes/notifications";
import tokenRoutes from "./routes/tokens";

import dbPool from "./config/database";

dotenv.config();
const app = express();
const PORT: number = Number(process.env.PORT) || 5000;

// --------------------------------------------------
// MIDDLEWARE (must always come first - IN THIS ORDER)
// --------------------------------------------------
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------
app.get("/health", async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    await dbPool.query("SELECT 1");
    return res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Ration TDS Backend",
      db: { connected: true, latencyMs: Date.now() - start },
    });
  } catch (error: any) {
    return res.status(503).json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      service: "Ration TDS Backend",
      db: { connected: false, error: error.message },
    });
  }
});

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/tokens", tokenRoutes);

// --------------------------------------------------
// ROOT
// --------------------------------------------------
app.get("/", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "Ration TDS Backend" });
});

// --------------------------------------------------
// 404 Handler
// --------------------------------------------------
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------
app.use(
  (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("❌ GLOBAL ERROR:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
);

// --------------------------------------------------
// START SERVER
// --------------------------------------------------
async function startServer() {
  try {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`📍 Health: /health`);
    });

    server.on("error", (error: any) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} already in use`);
        process.exit(1);
      }
      console.error("❌ Server error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
