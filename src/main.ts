import express, { Express } from "express";
import { createServer } from "http";
// import { Server } from "socket.io";
import mongoose, { ConnectOptions } from "mongoose";
import cors from "cors";

import {
  checkValidation,
  loginValidation,
  postCreateValidation,
  postEditValidation,
  registerValidation,
} from "./validations.js";
import { handleValidationErrors, checkAuth } from "./utils/index.js";

import { UserController, PostController, CommentController } from "./controllers/index.js";
import getUserId from "./utils/getUserId.js";

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
app.post("/auth/avatar", checkAuth, UserController.uploadAvatar);
app.delete("/auth/avatar", checkAuth, UserController.removeAvatar);

// app.get("/user/posts", checkAuth, PostController.getUserPosts);

app.post(
  "/posts",
  checkAuth,
  // postCreateValidation,
  // handleValidationErrors,
  PostController.create,
);
app.get("/posts/:id", checkAuth, PostController.getOne);
app.delete("/posts/:id", checkAuth, PostController.remove);
app.patch("/posts/:id", checkAuth, postEditValidation, handleValidationErrors, PostController.edit);

app.get("/user/posts/:username", checkAuth, getUserId, PostController.getUserPosts);
app.get("/user/reels/:username", checkAuth, getUserId, PostController.getUserReels);
app.get("/user/saved", checkAuth, PostController.getUserSavedPosts);

app.post("/posts/like/:id", checkAuth, PostController.addLike);
app.delete("/posts/like/:id", checkAuth, PostController.removeLike);

app.post("/posts/save/:id", checkAuth, PostController.addSaved);
app.delete("/posts/save/:id", checkAuth, PostController.removeSaved);

app.post("/comment/:id", checkAuth, CommentController.create);
app.delete("/comment/:id", checkAuth, CommentController.remove);
app.get("/comment/:id", checkAuth, CommentController.getPostComments);

app.post("/reply/:id", checkAuth, CommentController.reply);
app.get("/reply/:id", checkAuth, CommentController.getCommentReplies);

app.post("/comment/like/:id", checkAuth, CommentController.addLike);
app.delete("/comment/like/:id", checkAuth, CommentController.removeLike);

server.listen(port || 5555, () => console.log(`Server started on port ${port}`));
