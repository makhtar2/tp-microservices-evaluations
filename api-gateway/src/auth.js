const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-en-dev";

// Vérifie le JWT émis par user-service (même secret) et transmet
// l'identité aux services en aval via X-User-Id / X-User-Role. Les
// en-têtes X-User-* envoyés par le client sont toujours supprimés pour
// empêcher l'usurpation d'identité.
function authenticate(req, res, next) {
  delete req.headers["x-user-id"];
  delete req.headers["x-user-role"];

  const [scheme, token] = (req.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Token manquant (en-tête Authorization: Bearer <token>)" });
  }
  try {
    const claims = jwt.verify(token, JWT_SECRET);
    req.user = { id: claims.sub, role: claims.role };
    req.headers["x-user-id"] = claims.sub;
    req.headers["x-user-role"] = claims.role;
    next();
  } catch {
    res.status(401).json({ message: "Token invalide ou expiré" });
  }
}

// Contrôle d'accès grossier par rôle ; le contrôle fin reste dans chaque
// service. `methods` limite la règle à certaines méthodes HTTP.
function requireRole(roles, methods) {
  return (req, res, next) => {
    if (methods && !methods.includes(req.method)) return next();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès refusé pour ce rôle" });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
