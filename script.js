// ---------------------------------------------------------------
// Statut et console en direct via Server-Sent Events (SSE) :
// une connexion ouverte en continu, poussee par le serveur des
// qu'il y a du nouveau, plutot que le site qui rappelle sans arret.
// ---------------------------------------------------------------
const CONFIG = {
  controlBaseUrl: "https://brankes.duckdns.org:8443",
  wakeUrl: "http://brankes.duckdns.org:8090",
};

const TOKEN_STORAGE_KEY = "vs-control-token";

function getToken() {
  let token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) {
    token = prompt("Mot de passe du serveur :");
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
  return token;
}

function setButtonState(text, { disabled = false, onClick = null } = {}) {
  const btn = document.querySelector("[data-action-btn]");
  if (!btn) return;
  btn.textContent = text;
  btn.disabled = disabled;
  btn.onclick = onClick;
}

function setNote(text) {
  const note = document.querySelector("[data-action-note]");
  if (note) note.textContent = text;
}

function connectStatusStream() {
  const dot = document.querySelector("[data-status-dot]");
  const label = document.querySelector("[data-status-label]");
  const poweroffBtn = document.querySelector("[data-poweroff-btn]");
  if (!dot || !label) return;

  const url = `${CONFIG.controlBaseUrl}/status/stream`;
  const source = new EventSource(url);

  source.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (poweroffBtn) {
      poweroffBtn.hidden = false;
      poweroffBtn.disabled = false;
      poweroffBtn.textContent = "Éteindre la machine";
    }
    if (data.status === "on") {
      dot.className = "status-dot is-online";
      label.textContent = "Partie en cours";
      setButtonState("Arrêter la partie", { onClick: () => runControl("stop") });
    } else {
      dot.className = "status-dot is-offline";
      label.textContent = "Allumé, en attente";
      setButtonState("Démarrer la partie", { onClick: () => runControl("start") });
    }
  };

  source.onerror = () => {
    dot.className = "status-dot is-offline";
    label.textContent = "Éteint";
    if (poweroffBtn) poweroffBtn.hidden = true;
    if (!CONFIG.wakeUrl) {
      setNote("Bientôt : le réveil à distance arrive.");
      setButtonState("Réveiller le serveur", { disabled: true });
    } else {
      setNote("");
      setButtonState("Réveiller le serveur", { onClick: () => runWake() });
    }
    // EventSource retente la connexion tout seul, rien a faire ici.
  };
}

async function runControl(action) {
  const token = getToken();
  if (!token) { setNote("Mot de passe requis pour cette action."); return; }

  setButtonState(action === "start" ? "Démarrage…" : "Arrêt…", { disabled: true });
  try {
    const url = `${CONFIG.controlBaseUrl}/${action}?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.status === 403) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw new Error("mauvais mot de passe");
    }
    const data = await res.json();
    if (!data.ok) throw new Error("failed");
    setNote(
      action === "start"
        ? "Ça peut prendre une bonne minute le temps que le monde charge."
        : "Le monde se sauvegarde, ça prend quelques secondes."
    );
  } catch (err) {
    setNote("Mot de passe incorrect ou serveur indisponible. Réessaie.");
  }
  // Pas besoin de rafraichir a la main : le flux de statut se met a jour tout seul.
}

async function runWake() {
  setButtonState("Envoi en cours…", { disabled: true });
  // fetch() serait bloque par le navigateur (contenu mixte HTTPS -> HTTP),
  // mais une vraie navigation reste autorisee : on ouvre un onglet qui se
  // referme tout seul aussitot le signal envoye.
  const popup = window.open(`${CONFIG.wakeUrl}/wake`, "_blank", "width=250,height=150");
  setTimeout(() => { if (popup && !popup.closed) popup.close(); }, 1000);
  setNote("Signal envoyé, ça peut prendre 30 à 60 secondes avant que la machine réponde.");
  setTimeout(() => {
    setButtonState("Réveiller le serveur", { onClick: () => runWake() });
  }, 4000);
}

async function runPoweroff() {
  if (!confirm("Éteindre complètement la machine ? Il faudra utiliser le bouton de réveil pour la rallumer.")) return;

  const token = getToken();
  if (!token) { setNote("Mot de passe requis pour cette action."); return; }

  const btn = document.querySelector("[data-poweroff-btn]");
  if (btn) { btn.disabled = true; btn.textContent = "Extinction en cours…"; }
  try {
    const url = `${CONFIG.controlBaseUrl}/poweroff?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (res.status === 403) localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    // La connexion peut couper au moment ou la machine s'eteint vraiment : normal.
  }
  setNote("La machine s'éteint (le monde est sauvegardé au passage).");
}

function initPoweroffButton() {
  const btn = document.querySelector("[data-poweroff-btn]");
  if (!btn) return;
  btn.addEventListener("click", runPoweroff);
}

let consoleSource = null;

function initConsoleToggle() {
  const toggle = document.querySelector("[data-console-toggle]");
  const box = document.querySelector("[data-console-box]");
  if (!toggle || !box) return;

  toggle.addEventListener("click", () => {
    const isShowing = !box.hidden;
    if (isShowing) {
      box.hidden = true;
      toggle.textContent = "Afficher la console";
      if (consoleSource) { consoleSource.close(); consoleSource = null; }
      return;
    }

    const token = getToken();
    if (!token) return;

    box.hidden = false;
    box.textContent = "Connexion…";
    toggle.textContent = "Masquer la console";

    const url = `${CONFIG.controlBaseUrl}/console/stream?token=${encodeURIComponent(token)}`;
    consoleSource = new EventSource(url);
    let started = false;

    consoleSource.onmessage = (event) => {
      if (!started) { box.textContent = ""; started = true; }
      box.textContent += JSON.parse(event.data) + "\n";
      box.scrollTop = box.scrollHeight;
    };
    consoleSource.onerror = () => {
      if (!started) box.textContent = "Connexion impossible (mot de passe incorrect, ou machine éteinte).";
    };
  });
}

function initCopyButton() {
  const btn = document.querySelector("[data-copy-btn]");
  const value = document.querySelector("[data-copy-value]");
  if (!btn || !value) return;

  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(value.textContent.trim());
      const original = btn.textContent;
      btn.textContent = "Copié";
      setTimeout(() => (btn.textContent = original), 1500);
    } catch (err) {
      btn.textContent = "Copie impossible";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  connectStatusStream();
  initCopyButton();
  initPoweroffButton();
  initConsoleToggle();
});