const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");
const { CommandError } = require("./commands");

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

// Types de devoirs acceptés : documents, archives, images et code source.
// Tout le reste (exécutables, scripts web…) est refusé avant l'écriture.
const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".odt", ".txt", ".md", ".rtf",
  ".ppt", ".pptx", ".odp", ".xls", ".xlsx", ".ods", ".csv",
  ".zip", ".tar", ".gz", ".7z",
  ".png", ".jpg", ".jpeg",
  ".c", ".cpp", ".h", ".java", ".py", ".js", ".ts", ".sql", ".ipynb",
]);

function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(extension)) return cb(null, true);
  cb(new CommandError(400, `Type de fichier non accepté (${extension || "sans extension"})`));
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Nom stocké aléatoire (évite collisions et noms de fichiers malveillants) ;
// le nom d'origine est conservé dans la soumission (`nomFichier`).
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

module.exports = { upload, fileFilter, UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_EXTENSIONS };
