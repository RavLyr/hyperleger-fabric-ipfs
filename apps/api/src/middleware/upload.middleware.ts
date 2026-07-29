import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error("Only PDF and Excel (.xlsx) files are allowed"));
      return;
    }

    cb(null, true);
  },
});