import cors from "cors";
import path from "path";
import router from "./app/routes";
import cookieParser from "cookie-parser";
import notFound from "./app/middlewares/notFound";
import express, { Application, Request, Response } from "express";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";

const app: Application = express();

// parsers
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://career-path-employer-dashboard.vercel.app",
      "https://career-path-pearl.vercel.app",
    ],
    credentials: true,
  })
);

// app routes
app.use("/api/v1", router);

// Root route (health check)
app.get("/", async (req: Request, res: Response) => {
  res.status(200).send({
    success: true,
    message: "Career Path API is running 🚀",
  });
});

// global error handler & 404 handler
app.use(globalErrorHandler);
app.use(notFound);

export default app;
