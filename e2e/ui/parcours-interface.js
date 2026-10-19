// Parcours complet sur l'interface React, piloté dans Chrome headless via
// le protocole DevTools (aucune dépendance : WebSocket natif de Node ≥ 22).
// Prérequis : la plateforme et le frontend lancés (voir e2e/README.md).
// Une capture d'écran de chaque étape est écrite dans e2e/logs/ui/.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CHROME =
  process.env.CHROME_PATH ||
  (process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "google-chrome");
const OUT = path.join(__dirname, "../logs/ui");
const BASE = process.env.FRONTEND_URL || "http://localhost:5173";
const PORT = 9333;
const SUBJECT = `UI ${Date.now()}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

let ws;
let nextId = 1;
const pending = new Map();
let shot = 0;

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(fn, ...args) {
  const expression = `(${fn})(...${JSON.stringify(args)})`;
  const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
  return res.result.value;
}

async function waitFor(label, fn, ...args) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const v = await evaluate(fn, ...args);
      if (v) return v;
    } catch {
      // page en cours de chargement
    }
    await sleep(250);
  }
  await screenshot(`ECHEC-${label}`);
  throw new Error(`Délai dépassé : ${label}`);
}

const waitText = (text) => waitFor(`texte « ${text} »`, (t) => document.body?.innerText.includes(t), text);

async function screenshot(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  const file = path.join(OUT, `${String(++shot).padStart(2, "0")}-${name}.png`);
  fs.writeFileSync(file, Buffer.from(data, "base64"));
}

async function goto(url) {
  await send("Page.navigate", { url: BASE + url });
  await sleep(800);
}

// Helpers exécutés dans la page (React : setter natif + événement input).
const PAGE_HELPERS = `
window.__field = (label) => {
  const l = [...document.querySelectorAll("label, span.field-label")].find((x) => x.textContent.trim().startsWith(label));
  if (!l) throw new Error("label introuvable : " + label);
  if (l.htmlFor) return document.getElementById(l.htmlFor);
  return l.parentElement.querySelector("input, textarea, select");
};
window.__set = (el, value) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
};
window.__click = (text, selector = "button, a, label") => {
  const el = [...document.querySelectorAll(selector)].find((x) => x.textContent.trim().includes(text) && !x.disabled);
  if (!el) throw new Error("élément introuvable : " + text);
  el.click();
  return true;
};
`;

async function helpers() {
  await send("Runtime.evaluate", { expression: PAGE_HELPERS });
}

async function setField(label, value) {
  await helpers();
  await evaluate((l, v) => window.__set(window.__field(l), v), label, value);
}

async function click(text, selector) {
  await helpers();
  await evaluate((t, s) => window.__click(t, s), text, selector);
  await sleep(400);
}

async function login(email, password, expected) {
  await goto("/login");
  await waitFor("formulaire de connexion", () => !!document.getElementById("email"));
  await helpers();
  await evaluate((e, p) => {
    window.__set(document.getElementById("email"), e);
    window.__set(document.getElementById("password"), p);
  }, email, password);
  await click("Se connecter", "button");
  await waitText(expected);
}

async function logout() {
  await click("Déconnexion", "button");
  await waitFor("retour à la connexion", () => location.pathname === "/login");
}

async function createQuestion({ statement, type, points, setup }) {
  await setField("Énoncé", statement);
  await setField("Matière", SUBJECT);
  await setField("Chapitre", "Interface");
  await setField("Type", type);
  await setField("Points", String(points));
  await sleep(200);
  if (setup) await setup();
  await click("Créer la question", "button");
  await waitText(statement.slice(0, 30));
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-ui-"));
  const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--window-size=1440,1000",
    "--no-first-run",
    "about:blank",
  ]);

  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(500);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === "page");
    } catch {}
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    }
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  const steps = [];
  const step = async (name, fn) => {
    await fn();
    steps.push(name);
    console.log(`OK  ${name}`);
  };

  try {
    await step("connexion enseignant", async () => {
      await login("enseignant@evaluations.local", "enseignant123", "Bonjour");
      await screenshot("tableau-de-bord-enseignant");
    });

    await step("création d'un QCM avec ses bonnes réponses", async () => {
      await goto("/questions");
      await waitText("Nouvelle question");
      await createQuestion({
        statement: "Quel protocole utilise une API REST ?",
        type: "QCM",
        points: 2,
        setup: async () => {
          await helpers();
          await evaluate(() => {
            const opts = [...document.querySelectorAll('input[placeholder^="Option"]')];
            window.__set(opts[0], "HTTP");
            window.__set(opts[1], "FTP");
          });
        },
      });
    });

    await step("création d'une question ouverte", async () => {
      await createQuestion({
        statement: "Expliquez le rôle de l'api-gateway.",
        type: "QUESTION_OUVERTE",
        points: 3,
        setup: () => setField("Guide de correction", "Point d'entrée unique, JWT, routage."),
      });
      await screenshot("banque-de-questions");
    });

    await step("évaluation construite avec le sélecteur de questions, puis publiée", async () => {
      await goto("/evaluations");
      await waitText("Nouvelle évaluation");
      await setField("Titre", `Évaluation ${SUBJECT}`);
      await setField("Matière", SUBJECT);
      await click("Choisir les questions moi-même", "button");
      await waitText("Quel protocole utilise une API REST");
      await helpers();
      await evaluate(() => {
        document.querySelectorAll(".max-h-64 input[type=checkbox]").forEach((c) => c.click());
      });
      await waitText("barème total 5");
      await screenshot("selecteur-de-questions");
      await click("Créer l'évaluation", "button");
      await waitText(`Évaluation ${SUBJECT}`);
      await evaluate((titre) => {
        const row = [...document.querySelectorAll("tr")].find((r) => r.innerText.includes(titre));
        row.querySelector('button[aria-label="Publier"]').click();
      }, `Évaluation ${SUBJECT}`);
      await waitFor("statut Publiée", (titre) => {
        const row = [...document.querySelectorAll("tr")].find((r) => r.innerText.includes(titre));
        return row && row.innerText.includes("Publiée");
      }, `Évaluation ${SUBJECT}`);
      await screenshot("evaluation-publiee");
      await logout();
    });

    await step("l'étudiant passe l'évaluation (enregistrement auto, soumission)", async () => {
      await login("etudiant@evaluations.local", "etudiant123", "Mes évaluations");
      await waitText(`Évaluation ${SUBJECT}`);
      await screenshot("mes-evaluations");
      await evaluate((titre) => {
        const row = [...document.querySelectorAll("tr")].find((r) => r.innerText.includes(titre));
        row.querySelector("a").click();
      }, `Évaluation ${SUBJECT}`);
      // La copie s'ouvre dès que submission-service a reçu AssessmentPublished.
      await waitText("Commencer l'évaluation");
      await click("Commencer l'évaluation", "button");
      await waitText("Question 1");
      const visible = await evaluate(() => document.body.innerText);
      if (visible.includes("isCorrect") || visible.includes("Point d'entrée unique")) {
        throw new Error("les bonnes réponses ou le guide de correction sont visibles par l'étudiant");
      }
      await click("HTTP", "label");
      await helpers();
      await evaluate(() => window.__set(document.querySelector("textarea"), "Point d'entrée unique qui vérifie le JWT."));
      await waitText("Réponses enregistrées à");
      await screenshot("copie-en-cours");
      await click("Soumettre ma copie", "button");
      await click("Confirmer", "button");
      await waitText("Copie soumise le");
      await screenshot("copie-soumise");
      await logout();
    });

    await step("l'enseignant corrige la question ouverte et valide", async () => {
      await login("enseignant@evaluations.local", "enseignant123", "Bonjour");
      await goto("/correction");
      await waitFor("copie à corriger", (titre) => document.body.innerText.includes(titre), `Évaluation ${SUBJECT}`);
      await click(`Évaluation ${SUBJECT}`, "button");
      await waitText("Point d'entrée unique qui vérifie le JWT.");
      await screenshot("correction-copie");
      await helpers();
      await evaluate(() => {
        const notes = [...document.querySelectorAll('input[type=number][id^="note-"]')];
        const empty = notes.find((n) => n.value === "");
        window.__set(empty, "2.5");
      });
      await sleep(200);
      await evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((b) => b.innerText.includes("Enregistrer") && !b.disabled);
        btn.click();
      });
      await waitFor("bouton Valider actif", () =>
        [...document.querySelectorAll("button")].some((b) => b.innerText.includes("Valider et publier") && !b.disabled)
      );
      await click("Valider et publier", "button");
      await waitText("Résultat publié pour Moussa Ndiaye");
      await waitText("Aucune copie à corriger");
      const detail = await evaluate(() => document.body.innerText.includes("Valider et publier"));
      if (detail) throw new Error("le détail de la copie validée est encore affiché");
      await screenshot("correction-validee");
      await logout();
    });

    await step("l'étudiant consulte son résultat", async () => {
      await login("etudiant@evaluations.local", "etudiant123", "Mes évaluations");
      // Le résultat arrive par événement (result.published) : on recharge.
      const deadline = Date.now() + 15000;
      let found = false;
      while (!found && Date.now() < deadline) {
        await goto("/mes-resultats");
        await sleep(1200);
        found = await evaluate((titre) => document.body.innerText.includes(titre), `Évaluation ${SUBJECT}`);
      }
      if (!found) throw new Error("résultat non affiché");
      await waitText("4.5");
      await screenshot("mes-resultats");
      await logout();
    });

    await step("l'administrateur gère les comptes", async () => {
      await login("admin@evaluations.local", "admin123", "Gestion des");
      await waitText("etudiant@evaluations.local");
      await screenshot("utilisateurs");
    });

    console.log(`\n${steps.length} étapes réussies`);
  } catch (err) {
    console.log(`ECHEC : ${err.message}`);
    process.exitCode = 1;
  } finally {
    ws.close();
    chrome.kill();
  }
})();
