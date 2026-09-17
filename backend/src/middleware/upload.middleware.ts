import multer from "multer";
import path from "path";
import fs from "fs";
import { Storage } from "@google-cloud/storage";
import { Request } from "express";

// Safe local directory setup fallback
const localUploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(localUploadDir)) {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

let storageEngine: multer.StorageEngine;

const bucketName = process.env.GCS_BUCKET;
const keyFilename = process.env.GCS_KEYFILE || "./keyfile.json";

if (bucketName) {
  console.log(`☁️ Google Cloud Storage Upload Activated: Target Bucket [${bucketName}]`);
  
  const gcsOptions: any = {};
  if (fs.existsSync(keyFilename)) {
    gcsOptions.keyFilename = keyFilename;
  }
  
  const gcs = new Storage(gcsOptions);
  const bucket = gcs.bucket(bucketName);

  class GoogleCloudStorageEngine implements multer.StorageEngine {
    _handleFile(
      req: Request,
      file: Express.Multer.File,
      cb: (error?: any, info?: Partial<Express.Multer.File>) => void
    ): void {
      let folder = "misc";
      let isPublic = false;

      // Determine folder and privacy based on fieldname or route
      if (file.fieldname === "image") {
        folder = "product_images";
        isPublic = true;
      } else if (
        ["profile_image", "dl_document", "rc_document", "aadhaar_document"].includes(
          file.fieldname
        )
      ) {
        if (req.originalUrl.includes("transport")) {
          folder = "partners/transport";
        } else {
          folder = "partners/delivery";
        }
        isPublic = false;
      }

      const originalNameClean = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const filename = `${folder}/${Date.now()}_${originalNameClean}`;
      const gcsFile = bucket.file(filename);

      const stream = gcsFile.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
        resumable: false,
      });

      file.stream.pipe(stream);

      stream.on("error", (err) => {
        cb(err);
      });

      stream.on("finish", async () => {
        try {
          if (isPublic) {
            await gcsFile.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
            cb(null, {
              filename: publicUrl,
              path: publicUrl,
            });
          } else {
            // Private files store the gs:// URI or just the path for later Signed URL generation
            const gsUri = `gs://${bucketName}/${filename}`;
            cb(null, {
              filename: gsUri,
              path: gsUri,
            });
          }
        } catch (err) {
          cb(err);
        }
      });
    }

    _removeFile(
      req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null) => void
    ): void {
      const filename = file.filename.split("/").pop();
      if (filename) {
        bucket.file(filename).delete()
          .then(() => cb(null))
          .catch((err) => cb(err));
      } else {
        cb(null);
      }
    }
  }

  storageEngine = new GoogleCloudStorageEngine();
} else {
  console.log("💻 Local Disk Upload Activated (Fallback): Saving files to ./uploads");
  storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, localUploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });
}

export const upload = multer({ storage: storageEngine });
