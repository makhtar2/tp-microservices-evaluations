const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const User = require("../src/models/User");

function newUser(overrides = {}) {
  return new User({ email: "  Etudiant@Ecole.SN ", nom: "Samb", prenom: "Bara", role: "ETUDIANT", ...overrides });
}

describe("User — mot de passe", () => {
  it("ne stocke jamais le mot de passe en clair", async () => {
    const user = newUser();
    await user.setPassword("secret123");
    assert.ok(user.passwordHash);
    assert.notEqual(user.passwordHash, "secret123");
  });

  it("vérifie le bon mot de passe et refuse un mauvais", async () => {
    const user = newUser();
    await user.setPassword("secret123");
    assert.equal(await user.checkPassword("secret123"), true);
    assert.equal(await user.checkPassword("Secret123"), false);
    assert.equal(await user.checkPassword(""), false);
  });

  it("produit un hash différent pour deux comptes au même mot de passe (sel)", async () => {
    const a = newUser();
    const b = newUser();
    await a.setPassword("secret123");
    await b.setPassword("secret123");
    assert.notEqual(a.passwordHash, b.passwordHash);
  });
});

describe("User — validation", () => {
  it("normalise l'email en minuscules, sans espaces", () => {
    assert.equal(newUser().email, "etudiant@ecole.sn");
  });

  it("est actif par défaut", () => {
    assert.equal(newUser().active, true);
  });

  it("accepte les trois rôles de la plateforme", async () => {
    for (const role of User.ROLES) {
      const user = newUser({ role });
      await user.setPassword("x");
      assert.equal(user.validateSync(), undefined, role);
    }
  });

  it("refuse un rôle inconnu", async () => {
    const user = newUser({ role: "SURVEILLANT" });
    await user.setPassword("x");
    assert.ok(user.validateSync()?.errors.role);
  });

  it("exige email, nom, prénom et mot de passe", () => {
    const error = new User({ role: "ETUDIANT" }).validateSync();
    for (const field of ["email", "nom", "prenom", "passwordHash"]) {
      assert.ok(error?.errors[field], field);
    }
  });
});

describe("User — sérialisation JSON", () => {
  it("expose id mais ni _id, ni __v, ni le hash du mot de passe", async () => {
    const user = newUser();
    await user.setPassword("secret123");
    const json = user.toJSON();
    assert.equal(json.id, user.id);
    assert.equal(json._id, undefined);
    assert.equal(json.__v, undefined);
    assert.equal(json.passwordHash, undefined);
    assert.doesNotMatch(JSON.stringify(user), /passwordHash/);
  });
});
