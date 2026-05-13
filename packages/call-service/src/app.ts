import express from "express";
import cors from "cors";
import eventsRouter from "./routes/events";
import callsRouter from "./routes/calls";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.path} → ${res.statusCode} (${Date.now() - start}ms)`,
    );
  });
  next();
});

app.use("/api/events", eventsRouter);
app.use("/api/calls", callsRouter);

app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  }),
);

export { app };
