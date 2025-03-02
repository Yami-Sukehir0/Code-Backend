import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16KB" })); //The basic configs about the app data flow
app.use(express.urlencoded({ extended: true, limit: "16KB" }));
app.use(express.static("public"));
app.use(cookieParser());

//import router
import userRouter from "./routes/user.routes.js";

//declaration
app.use("/api/v1/users", userRouter);

//http://localhost:8000/api/v1/users/register

export { app };
