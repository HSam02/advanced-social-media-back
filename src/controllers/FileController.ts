import multer from "multer";
import fs from "fs";
import { Request, Response } from "express";

const postsStorage = multer.diskStorage({
  destination: (req, __, callback) => {
    console.log(req.userId);
    const userDir = `./src/uploads/${req.userId}`;

    if (!fs.existsSync("./src/uploads")) {
      fs.mkdirSync("./src/uploads");
    }
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir);
    }

    if (!fs.existsSync(`${userDir}/posts`)) {
      fs.mkdirSync(`${userDir}/posts`);
    }

    callback(null, `${userDir}/posts`);
  },
  filename: (req, file, callback) => {
    const fileName = `${req.userId}_${Math.random()
      .toString()
      .replace("0.", "")
      .substring(0, 6)}_${Date.now()}.${file.originalname.split(".").pop()}`;
    // req.on("error", () => {
    //   if (fs.existsSync(`./src/uploads/${fileName}`)) {
    //     fs.unlinkSync(`./src/uploads/${fileName}`);
    //   }
    //   const err = new Error("Image was not upload");
    //   err.name = "stop";
    //   callback(err, fileName);
    // });
    callback(null, fileName);
  },
});
const upload = multer({
  storage: postsStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, callback) => {
    if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png" && file.mimetype !== "video/mp4") {
      callback(null, false);
      const err = new Error("Only .png, .jpg, .jpeg and .mp4 format allowed!");
      err.name = "ExtensionError";
      return callback(err);
    }
    callback(null, true);
  },
}).array("post_media", 10);

export const uploadImages = (req: Request, res: Response) => {
  upload(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: "Images were not upload",
        error,
      });
    }
    const data = JSON.parse(req.body.data);
    console.log(data);
    
    const files = req.files as Express.Multer.File[];
    const fileNames = files.map((file) => ({
      name: file.filename
    }));
    res.json(fileNames);
  });
};

export const deleteOne = async (req: Request, res: Response) => {
  try {
    const fileName = req.params.id;
    if (fileName.split("_")[0] !== (req.userId as unknown as string)) {
      return res.status(403).json({
        message: "No access",
      });
    }
    await fs.promises.unlink("src/uploads/" + fileName);
    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "Image was not delete",
      error,
    });
  }
};

export const deleteMany = async (req: Request, res: Response) => {
  try {
    const images: string[] = req.body;
    let access = true;
    images.forEach((image) => {
      if (image.split("_")[0] !== (req.userId as unknown as string)) {
        access = false;
      }
    });
    if (!access) {
      return res.status(403).json({
        message: "No access",
      });
    }

    await Promise.all(
      images.map(async (image) => {
        try {
          await fs.promises.unlink("src/uploads/" + image);
        } catch (error) {
          throw new Error("Image was not delete");
        }
      }),
    );

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: "Image was not delete",
      error,
    });
  }
};
