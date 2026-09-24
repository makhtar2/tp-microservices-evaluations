const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Nom stocké aléatoire (évite collisions et noms de fichiers malveillants) ;
// le nom d'origine est conservé dans la soumission (`nomFichier`).
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});

const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

module.exports = { upload, UPLOAD_DIR, MAX_FILE_SIZE };
