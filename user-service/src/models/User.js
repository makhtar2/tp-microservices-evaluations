const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

const ROLES = ["ADMINISTRATEUR", "ENSEIGNANT", "ETUDIANT"];

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    nom: { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },
    role: { type: String, enum: ROLES, required: true, index: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.checkPassword = function checkPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Expose `id` au lieu de `_id` et ne renvoie jamais le hash du mot de passe.
userSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
