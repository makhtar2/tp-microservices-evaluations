const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");

process.env.UPLOAD_DIR = path.join(os.tmpdir(), "submission-service-test-uploads");
const { fileFilter } = require("../src/upload");
const { CommandError } = require("../src/commands");

function filter(originalname) {
  return new Promise((resolve) => fileFilter({}, { originalname }, (err, accepted) => resolve({ err, accepted })));
}

describe("fileFilter — types de fichiers déposés", () => {
  it("accepte les documents, archives, images et sources", async () => {
    for (const name of ["rapport.pdf", "TP.DOCX", "projet.zip", "schema.png", "main.py", "Serveur.java"]) {
      const { err, accepted } = await filter(name);
      assert.equal(err, null, name);
      assert.equal(accepted, true, name);
    }
  });

  it("refuse les exécutables et pages web avec une erreur 400", async () => {
    for (const name of ["virus.exe", "script.sh", "page.html", "macro.bat"]) {
      const { err } = await filter(name);
      assert.ok(err instanceof CommandError, name);
      assert.equal(err.status, 400, name);
    }
  });

  it("refuse un fichier sans extension", async () => {
    const { err } = await filter("Makefile");
    assert.match(err.message, /sans extension/);
  });

  it("ne se laisse pas tromper par une double extension", async () => {
    const { err } = await filter("rapport.pdf.exe");
    assert.ok(err);
  });
});
