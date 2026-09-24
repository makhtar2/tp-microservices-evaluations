const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-en-dev";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

// Claims du token : `sub` (id utilisateur), `role`, `email`. L'api-gateway
// vérifiera ce même token (secret partagé JWT_SECRET) et transmettra
// l'identité aux autres services (en-tête X-User-Id).
function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function authenticate(req, res, next) {
  const [scheme, token] = (req.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Token manquant (en-tête Authorization: Bearer <token>)" });
  }
  try {
    const claims = jwt.verify(token, JWT_SECRET);
    req.user = { id: claims.sub, role: claims.role, email: claims.email };
    next();
  } catch {
    res.status(401).json({ message: "Token invalide ou expiré" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès refusé pour ce rôle" });
    }
    next();
  };
}

module.exports = { signToken, authenticate, requireRole };
