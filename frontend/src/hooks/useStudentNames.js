import { useEffect, useState } from "react";
import { listUsers } from "../api/users";

// Noms des étudiants (id → « Prénom Nom ») pour les vues enseignant ;
// user-service autorise cette liste aux enseignants et administrateurs.
// En cas d'échec, l'identifiant reste affiché.
export function useStudentNames() {
  const [names, setNames] = useState({});

  useEffect(() => {
    listUsers({ role: "ETUDIANT" })
      .then((users) => setNames(Object.fromEntries(users.map((u) => [u.id, `${u.prenom} ${u.nom}`]))))
      .catch(() => {});
  }, []);

  return (id) => names[id] ?? id;
}
