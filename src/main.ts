import express, { Express, Request, Response } from "express";
import { createServer } from "http";
// import { Server } from "socket.io";
import mongoose, { ConnectOptions } from "mongoose";
import cors from "cors";

import { checkValidation, loginValidation, postCreateValidation, registerValidation } from "./validations.js";
import { handleValidationErrors, checkAuth } from "./utils/index.js";

import { UserController, PostController, FileController } from "./controllers/index.js";

const app: Express = express();
const server = createServer(app);
// const io = new Server(server, { cors: { origin: "*" } });

const port: number = Number(process.env.PORT) || 5555;
const mongoUri: string = process.env.MONGODB_URI || "";

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    autoIndex: true,
    keepAlive: true,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
    useUnifiedTopology: true,
  } as ConnectOptions)
  .then(() => console.log("DB ok"))
  .catch((err) => console.log(`DB error: ${err}`));

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("./src/uploads"));

app.post("/auth/register", registerValidation, handleValidationErrors, UserController.register);
app.post("/auth/login", loginValidation, handleValidationErrors, UserController.login);
app.get("/auth/me", checkAuth, UserController.getUser);
app.post("/auth/check", checkValidation, handleValidationErrors, UserController.checkIsFree);

app.post("/posts", checkAuth, postCreateValidation, handleValidationErrors, PostController.create);

// app.post("/uploads", checkAuth, FileController.uploadImages);
// app.delete("/uploads/:id", checkAuth, FileController.deleteOne);
// app.post("/uploads/delete", checkAuth, FileController.deleteMany);

server.listen(port || 5555, () => console.log(`Server started on port ${port}`));
