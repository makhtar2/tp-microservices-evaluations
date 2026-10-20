import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StateBlock from "../components/ui/StateBlock";
import { listUsers, createUser, updateUser, setUserActive } from "../api/users";
import { useAuth } from "../auth/useAuth";

const ROLES = { ETUDIANT: "Étudiant", ENSEIGNANT: "Enseignant", ADMINISTRATEUR: "Administrateur" };
const EMPTY_FORM = { prenom: "", nom: "", email: "", password: "", role: "ETUDIANT" };

// UC9 : l'administrateur crée les comptes, change les rôles et
// désactive les comptes (jamais le sien).
export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function load(role = roleFilter) {
    listUsers({ role })
      .then(setUsers)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createUser(form);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function act(action) {
    setError(null);
    try {
      await action();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const field = (key, label, props = {}) => (
    <div className="flex flex-col gap-1.5">
      <label className="field-label" htmlFor={`user-${key}`}>
        {label}
      </label>
      <input
        id={`user-${key}`}
        className="field-input"
        required
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        {...props}
      />
    </div>
  );

  return (
    <>
      <h1 className="text-[28px] font-extrabold tracking-tight">
        Gestion des <span className="text-ink-faint">utilisateurs</span>
      </h1>

      {error && <StateBlock title="Action impossible" hint={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
        <Card>
          <CardHeader title="Nouveau compte" />
          <form className="flex flex-col gap-4" onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-4">
              {field("prenom", "Prénom")}
              {field("nom", "Nom")}
            </div>
            {field("email", "Email", { type: "email" })}
            {field("password", "Mot de passe initial", { type: "password", minLength: 6, autoComplete: "new-password" })}
            <div className="flex flex-col gap-1.5">
              <label className="field-label" htmlFor="user-role">
                Rôle
              </label>
              <select
                id="user-role"
                className="field-input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {Object.entries(ROLES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={submitting}>
              <UserPlus size={16} /> {submitting ? "Création…" : "Créer le compte"}
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader
            title="Comptes"
            subtitle={users ? `${users.length} compte(s)` : ""}
            action={
              <select
                className="field-input min-w-[160px]"
                aria-label="Filtrer par rôle"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  load(e.target.value);
                }}
              >
                <option value="">Tous les rôles</option>
                {Object.entries(ROLES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            }
          />
          {!users && !error && <StateBlock title="Chargement…" />}
          {users && users.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>État</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong className="block font-semibold text-[13px]">
                        {u.prenom} {u.nom}
                      </strong>
                      <span className="text-ink-muted text-xs">{u.email}</span>
                    </td>
                    <td>
                      <select
                        className="field-input !py-1.5"
                        aria-label={`Rôle de ${u.prenom} ${u.nom}`}
                        value={u.role}
                        disabled={u.id === me.id}
                        onChange={(e) => act(() => updateUser(u.id, { role: e.target.value }))}
                      >
                        {Object.entries(ROLES).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Badge tone={u.active ? "positive" : "neutral"}>{u.active ? "Actif" : "Désactivé"}</Badge>
                    </td>
                    <td className="text-right">
                      {u.id !== me.id && (
                        <Button
                          size="sm"
                          variant={u.active ? "danger" : "secondary"}
                          onClick={() => act(() => setUserActive(u.id, !u.active))}
                        >
                          {u.active ? "Désactiver" : "Réactiver"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
