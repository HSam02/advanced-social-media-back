import multer from "multer";
import fs from "fs";
import { Request, Response } from "express";

const storage = multer.diskStorage({
  destination: (_, __, callback) => {
    if (!fs.existsSync("./src/uploads")) {
      fs.mkdirSync("./src/uploads");
    }
    callback(null, "./src/uploads");
  },
  filename: (req, file, callback) => {
    const fileName = `${req.userId}_${Math.random()
      .toString()
      .replace("0.", "")
      .substring(0, 6)}_${Date.now()}.${file.originalname.split(".").pop()}`;
    req.on("error", () => {
      if (fs.existsSync(`./src/uploads/${fileName}`)) {
        fs.unlinkSync(`./src/uploads/${fileName}`);
      }
      const err = new Error("Image was not upload");
      err.name = "stop";
      callback(err, fileName);
    });
    callback(null, fileName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, callback) => {
    if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png") {
      callback(null, false);
      const err = new Error("Only .png, .jpg and .jpeg format allowed!");
      err.name = "ExtensionError";
      return callback(err);
    }
    callback(null, true);
  },
}).array("images", 10);
export const uploadImages = (req: Request, res: Response) => {
  upload(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: "Images were not upload",
        error,
      });
    }
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
