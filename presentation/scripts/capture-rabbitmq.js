// Captures de l'interface d'administration RabbitMQ pour le support de
// soutenance (queues des services, exchange evaluations.events).
// Prérequis : la stack Docker lancée (RabbitMQ sur le port 15672).
// Même principe que e2e/ui/parcours-interface.js : Chrome headless piloté
// par le protocole DevTools, sans dépendance.
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CHROME =
  process.env.CHROME_PATH ||
  (process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : "google-chrome");
const BASE = process.env.RABBITMQ_UI_URL || "http://localhost:15672";
const OUT = path.join(__dirname, "../assets/captures");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Une visite par page, plusieurs captures. `zoom` : texte contenu dans le
// tableau à cadrer (capture nette, échelle 2) ; sans zoom, toute la fenêtre.
// `width` : part de la largeur du tableau à garder (colonnes de gauche).
const PAGES = [
  {
    hash: "#/queues",
    shots: [
      { name: "rabbitmq-queues" },
      { name: "rabbitmq-queues-zoom", zoom: "Message rates" },
      { name: "rabbitmq-queues-noms", zoom: "Message rates", width: 0.6 },
    ],
  },
  {
    // Section « Bindings » dépliée : routing keys → queues des services.
    hash: "#/exchanges/%2F/evaluations.events",
    expand: "Bindings",
    shots: [{ name: "rabbitmq-exchange" }, { name: "rabbitmq-bindings-zoom", zoom: "Routing key" }],
  },
];

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-rabbitmq-"));
  const chrome = spawn(CHROME, [
    "--headless=new",
    // Port choisi par Chrome, lu ensuite dans DevToolsActivePort.
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "about:blank",
  ]);

  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      const port = fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0];
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === "page");
    } catch {}
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  });
  const send = (method, params = {}) => {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => pending.set(id, resolve));
  };

  try {
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

    // Connexion par le formulaire (identifiants par défaut guest / guest).
    await send("Page.navigate", { url: `${BASE}/` });
    await sleep(3000);
    await send("Runtime.evaluate", {
      expression: `
        document.querySelector("input[name=username]").value = "guest";
        document.querySelector("input[name=password]").value = "guest";
        document.querySelector("form input[type=submit], form button").click();
      `,
    });
    await sleep(3000);

    for (const page of PAGES) {
      await send("Page.navigate", { url: `${BASE}/${page.hash}` });
      await sleep(3000);
      if (page.expand) {
        await send("Runtime.evaluate", {
          expression: `[...document.querySelectorAll("h2")].find((h) => h.textContent.trim() === ${JSON.stringify(page.expand)})?.click()`,
        });
        await sleep(1500);
      }
      for (const shot of page.shots) {
        const params = { format: "png" };
        if (shot.zoom) {
          const { result } = await send("Runtime.evaluate", {
            expression: `(() => {
              // Le premier tableau de données (table.list) visible qui contient le texte voulu.
              const el = [...document.querySelectorAll("table.list")].find(
                (t) => t.innerText.includes(${JSON.stringify(shot.zoom)}) && t.getBoundingClientRect().width > 0
              );
              const r = el.getBoundingClientRect();
              return JSON.stringify({ x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height });
            })()`,
            returnByValue: true,
          });
          if (result.value === undefined) throw new Error(`${shot.name} : tableau introuvable`);
          const r = JSON.parse(result.value);
          const width = shot.width ? r.width * shot.width : r.width + 16;
          params.clip = { x: r.x - 8, y: r.y - 8, width, height: r.height + 16, scale: 2 };
          params.captureBeyondViewport = true;
        }
        const { data } = await send("Page.captureScreenshot", params);
        fs.writeFileSync(path.join(OUT, `${shot.name}.png`), Buffer.from(data, "base64"));
        console.log(`OK  ${shot.name}.png`);
      }
    }
  } finally {
    ws.close();
    chrome.kill();
  }
})();
