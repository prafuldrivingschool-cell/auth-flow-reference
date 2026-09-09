import express from "express";
import authRouter from "./routes/auth.js";

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal_server_error" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`Auth API listening on :${port}`));
}

export default app;
