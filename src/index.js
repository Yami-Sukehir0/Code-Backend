// require("dotenv").config({ path: "./env" }); old version syntax
import dotenv from "dotenv"; //new version syntax
import connectDB from "./db/index.js";
dotenv.config({
  path: "./env",
});

connectDB();

// import express from "express";
// const app = express();

// //self executing function or IIFE to connect db
// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log("ERR", error);
//       throw err;
//     });
//     app.listen(process.env.PORT, () => {
//       console.log(`App is listening on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.error("ERROR", error);
//     throw err;
//   }
// })();
