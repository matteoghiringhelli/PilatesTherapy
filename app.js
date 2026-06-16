const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const MAX_PARTECIPANTI = {
  "Privata": 1,
  "Duetto": 2,
  "Mini-Gruppo": 4
};

let clientiData = [];
let lezioniData = [];
let prenotazioniData = [];

// ---------------- STATUS ----------------
function setStatus(msg, type = "ok") {
  const el = document.getElementById("status");
  if (!el) return;

  el.textContent = msg || "";
  el.className = type;
}

// ---------------- AUTH ----------------
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

// ---------------- INIT ----------------
window.addEventListener("DOMContentLoaded", async () => {
  try {
    generaOrari();
    await loadAll();
    setStatus("Dashboard caricata correttamente ✅", "ok");
  } catch (error) {
    console.error(error);
    setStatus("Errore caricamento dashboard", "err");
  }
});

async function loadAll() {
  await loadClienti();
  await loadLezioni();
  await loadPrenotazioni();
}

// ---------------- ORARI ----------------
function generaOrari() {
  const select = document.getElementById("new_ora");
  if (!select) return;

  select.innerHTML = `<option value="">Ora</option>`;

  for (let h = 7; h <= 21; h++) {
    for (let m of [0, 30]) {
      const ora = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");

      const option = document.createElement("option");
      option.value = ora;
      option.textContent = ora;
      select.appendChild(option);
    }
  }
}

// ---------------- TOGGLE ----------------
function toggleClienti() {
  const el = document.getElementById("clientiSection");
  if (!el) return;
  el.classList.toggle("hidden");
}

function toggleLezioni() {
  const el = document.getElementById("lezioniSection");
  if (!el) return;
  el.classList.toggle("hidden");
}

// ---------------- CLIENTI ----------------
async function loadClienti() {
  const { data, error } = await supabaseClient
    .from("clienti")
    .select("*")
    .order("Nome", { ascending: true });

  if (error) {
    console.error(error);
    setStatus("Errore caricamento clienti", "err");
    return;
  }

  clientiData = data || [];
  renderClienti();
  renderSelectClienti();
}

function renderClienti() {
  const output = document.getElementById("outputClienti");
  if (!output) return;

  output.innerHTML = `
    <table>
      <tr>
        <th>ID_Cliente</th>
        <th>Nome</th>
        <th>Cognome</th>
        <th>Telefono</th>
        <th>Email</th>
        <th>Indirizzo</th>
        <th>Città</th>
        <th>CAP</th>
        <th>Codice_Fiscale</th>
        <th>Data_Registrazione</th>
        <th>Azioni</th>
      </tr>
      ${clientiData.map(c => `
        <tr>
          <td>${safe(c.ID_Cliente)}</td>
          <td>${safe(c.Nome)}</td>
          <td>${safe(c.Cognome)}</td>
          <td>${safe(c.Telefono)}</td>
          <td>${safe(c.Email)}</td>
          <td>${safe(c.Indirizzo)}</td>
          <td>${safe(c["Cittá"])}</td>
          <td>${safe(c.CAP)}</td>
          <td>${safe(c.Codice_Fiscale)}</td>
          <td>${safe(c.Data_Registrazione)}</td>
          <td>
            <button onclick="modificaCliente('${escapeQuote(c.ID_Cliente)}')">Modifica</button>
            <button onclick="eliminaCliente('${escapeQuote(c.ID_Cliente)}')">Elimina</button>
          </td>
        </tr>
      `).join("")}
    </table>
  `;
}

function renderSelectClienti() {
  const select = document.getElementById("select_cliente");
  if (!select) return;

  select.innerHTML =
    `<option value="">Seleziona cliente</option>` +
    clientiData.map(c => `
      <option value="${escapeHtmlAttr(c.ID_Cliente)}">${safe(c.Nome)} ${safe(c.Cognome)}</option>
    `).join("");
}

async function aggiungiCliente() {
  const payload = {
    ID_Cliente: "CL" + Date.now(),
    Nome: document.getElementById("new_nome").value.trim(),
    Cognome: document.getElementById("new_cognome").value.trim(),
    Telefono: document.getElementById("new_telefono").value.trim(),
    Email: document.getElementById("new_email").value.trim(),
    Indirizzo: document.getElementById("new_indirizzo").value.trim(),
    Cittá: document.getElementById("new_citta").value.trim(),
    CAP: document.getElementById("new_cap").value.trim(),
    Codice_Fiscale: document.getElementById("new_cf").value.trim(),
    Data_Registrazione: new Date().toISOString().split("T")[0]
  };

  if (!payload.Nome || !payload.Cognome) {
    setStatus("Nome e Cognome sono obbligatori", "err");
    return;
  }

  const { error } = await supabaseClient
    .from("clienti")
    .insert([payload]);

  if (error) {
    console.error(error);
    setStatus("Errore salvataggio cliente", "err");
    return;
  }

  pulisciFormCliente();
  await loadClienti();
  setStatus("Cliente salvato correttamente ✅", "ok");
}

async function modificaCliente(id) {
  const cliente = clientiData.find(c => String(c.ID_Cliente) === String(id));
  if (!cliente) return;

  const nome = prompt("Nome", cliente.Nome || "");
  if (nome === null) return;

  const cognome = prompt("Cognome", cliente.Cognome || "");
  if (cognome === null) return;

  const telefono = prompt("Telefono", cliente.Telefono || "");
  if (telefono === null) return;

  const email = prompt("Email", cliente.Email || "");
  if (email === null) return;

  const indirizzo = prompt("Indirizzo", cliente.Indirizzo || "");
  if (indirizzo === null) return;

  const citta = prompt("Città", cliente["Cittá"] || "");
  if (citta === null) return;

  const cap = prompt("CAP", cliente.CAP || "");
  if (cap === null) return;

  const cf = prompt("Codice Fiscale", cliente.Codice_Fiscale || "");
  if (cf === null) return;

  const { error } = await supabaseClient
    .from("clienti")
    .update({
      Nome: nome,
      Cognome: cognome,
      Telefono: telefono,
      Email: email,
      Indirizzo: indirizzo,
      Cittá: citta,
      CAP: cap,
      Codice_Fiscale: cf
    })
    .eq("ID_Cliente", id);

  if (error) {
    console.error(error);
    setStatus("Errore modifica cliente", "err");
    return;
  }

  await loadClienti();
  await loadPrenotazioni();
  setStatus("Cliente modificato correttamente ✅", "ok");
}

async function eliminaCliente(id) {
  if (!confirm("Eliminare cliente?")) return;

  const { error } = await supabaseClient
    .from("clienti")
    .delete()
    .eq("ID_Cliente", id);

  if (error) {
    console.error(error);
    setStatus("Errore eliminazione cliente", "err");
    return;
  }

  await loadClienti();
  await loadPrenotazioni();
  setStatus("Cliente eliminato correttamente ✅", "ok");
}

function pulisciFormCliente() {
  document.getElementById("new_nome").value = "";
  document.getElementById("new_cognome").value = "";
  document.getElementById("new_telefono").value = "";
  document.getElementById("new_email").value = "";
  document.getElementById("new_indirizzo").value = "";
  document.getElementById("new_citta").value = "";
  document.getElementById("new_cap").value = "";
  document.getElementById("new_cf").value = "";
}

// ---------------- LEZIONI ----------------
async function loadLezioni() {
  const { data, error } = await supabaseClient
    .from("lezioni")
    .select("*")
    .order("Data", { ascending: true })
    .order("Ora", { ascending: true });

  if (error) {
    console.error(error);
    setStatus("Errore caricamento lezioni", "err");
    return;
  }

  lezioniData = data || [];
  renderLezioni();
  renderSelectLezioni();
}

function renderLezioni() {
  const output = document.getElementById("outputLezioni");
  if (!output) return;

  output.innerHTML = `
    <table>
      <tr>
        <th>ID_Lezione</th>
        <th>Data</th>
        <th>Ora</th>
        <th>Tipologia</th>
        <th>Istruttore</th>
        <th>Max_Partecipanti</th>
        <th>Prenotati</th>
        <th>Posti rimasti</th>
        <th>Azioni</th>
      </tr>
      ${lezioniData.map(l => {
        const prenotati = prenotazioniData.filter(p => String(p.ID_Lezione) === String(l.ID_Lezione)).length;
        const max = Number(l.Max_Partecipanti || 0);
        const rimasti = Math.max(max - prenotati, 0);

        return `
          <tr>
            <td>${safe(l.ID_Lezione)}</td>
            <td>${safe(l.Data)}</td>
            <td>${safe(l.Ora)}</td>
            <td>${safe(l.Tipologia)}</td>
            <td>${safe(l.Istruttore)}</td>
            <td>${safe(l.Max_Partecipanti)}</td>
            <td>${prenotati}</td>
            <td>${rimasti}</td>
            <td>
              <button onclick="eliminaLezione('${escapeQuote(l.ID_Lezione)}')">Elimina</button>
            </td>
          </tr>
        `;
      }).join("")}
    </table>
  `;
}

function renderSelectLezioni() {
  const select = document.getElementById("select_lezione");
  if (!select) return;

  select.innerHTML =
    `<option value="">Seleziona lezione</option>` +
    lezioniData.map(l => `
      <option value="${escapeHtmlAttr(l.ID_Lezione)}">${safe(l.Data)} ${safe(l.Ora)} - ${safe(l.Tipologia)}</option>
    `).join("");
}

async function aggiungiLezione() {
  const data = document.getElementById("new_data").value;
  const ora = document.getElementById("new_ora").value;
  const tipologia = document.getElementById("new_tipologia").value;
  const istruttore = document.getElementById("new_istruttore").value.trim();

  if (!data || !ora || !tipologia || !istruttore) {
    setStatus("Compila tutti i campi della lezione", "err");
    return;
  }

  const payload = {
    ID_Lezione: "LEZ" + Date.now(),
    Data: data,
    Ora: ora,
    Tipologia: tipologia,
    Istruttore: istruttore,
    Max_Partecipanti: MAX_PARTECIPANTI[tipologia]
  };

  const { error } = await supabaseClient
    .from("lezioni")
    .insert([payload]);

  if (error) {
    console.error(error);
    setStatus("Errore salvataggio lezione", "err");
    return;
  }

  pulisciFormLezione();
  await loadLezioni();
  await loadPrenotazioni();
  setStatus("Lezione salvata correttamente ✅", "ok");
}

async function eliminaLezione(id) {
  if (!confirm("Eliminare lezione e tutte le prenotazioni collegate?")) return;

  // 1) Elimino prima le prenotazioni collegate
  const { error: errorPren } = await supabaseClient
    .from("prenotazioni")
    .delete()
    .eq("ID_Lezione", id);

  if (errorPren) {
    console.error(errorPren);
    setStatus("Errore eliminazione prenotazioni collegate", "err");
    return;
  }

  // 2) Elimino la lezione
  const { error: errorLez } = await supabaseClient
    .from("lezioni")
    .delete()
    .eq("ID_Lezione", id);

  if (errorLez) {
    console.error(errorLez);
    setStatus("Errore eliminazione lezione", "err");
    return;
  }

  await loadLezioni();
  await loadPrenotazioni();
  setStatus("Lezione e prenotazioni collegate eliminate correttamente ✅", "ok");
}

function pulisciFormLezione() {
  document.getElementById("new_data").value = "";
  document.getElementById("new_ora").value = "";
  document.getElementById("new_tipologia").value = "";
  document.getElementById("new_istruttore").value = "";
}

// ---------------- PRENOTAZIONI ----------------
async function loadPrenotazioni() {
  const { data, error } = await supabaseClient
    .from("prenotazioni")
    .select("*")
    .order("ID_Prenotazione", { ascending: true });

  if (error) {
    console.error(error);
    setStatus("Errore caricamento prenotazioni", "err");
    return;
  }

  prenotazioniData = data || [];
  renderPrenotazioni();
  renderLezioni(); // IMPORTANTISSIMO: aggiorna i posti rimasti dopo aver caricato le prenotazioni
}

function renderPrenotazioni() {
  const output = document.getElementById("outputPrenotazioni");
  if (!output) return;

  output.innerHTML = `
    <table>
      <tr>
        <th>ID_Prenotazione</th>
        <th>ID_Cliente</th>
        <th>Cliente</th>
        <th>ID_Lezione</th>
        <th>Lezione</th>
        <th>Azioni</th>
      </tr>
      ${prenotazioniData.map(p => {
        const cliente = clientiData.find(c => String(c.ID_Cliente) === String(p.ID_Cliente));
        const lezione = lezioniData.find(l => String(l.ID_Lezione) === String(p.ID_Lezione));

        const clienteLabel = cliente
          ? `${safe(cliente.Nome)} ${safe(cliente.Cognome)}`
          : "Cliente non trovato";

        const lezioneLabel = lezione
          ? `${safe(lezione.Data)} ${safe(lezione.Ora)} - ${safe(lezione.Tipologia)}`
          : "Lezione non trovata";

        return `
          <tr>
            <td>${safe(p.ID_Prenotazione)}</td>
            <td>${safe(p.ID_Cliente)}</td>
            <td>${clienteLabel}</td>
            <td>${safe(p.ID_Lezione)}</td>
            <td>${lezioneLabel}</td>
            <td>
              <button onclick="eliminaPrenotazione('${escapeQuote(p.ID_Prenotazione)}')">Elimina</button>
            </td>
          </tr>
        `;
      }).join("")}
    </table>
  `;
}

async function prenota() {
  const idCliente = document.getElementById("select_cliente").value;
  const idLezione = document.getElementById("select_lezione").value;

  if (!idCliente || !idLezione) {
    setStatus("Seleziona cliente e lezione", "err");
    return;
  }

  const duplicato = prenotazioniData.find(p =>
    String(p.ID_Cliente) === String(idCliente) &&
    String(p.ID_Lezione) === String(idLezione)
  );

  if (duplicato) {
    setStatus("Prenotazione già esistente", "err");
    return;
  }

  const lezione = lezioniData.find(l => String(l.ID_Lezione) === String(idLezione));
  if (!lezione) {
    setStatus("Lezione non trovata", "err");
    return;
  }

  const count = prenotazioniData.filter(p => String(p.ID_Lezione) === String(idLezione)).length;
  const max = Number(lezione.Max_Partecipanti || 0);

  if (count >= max) {
    setStatus("Lezione piena", "err");
    return;
  }

  const { data, error } = await supabaseClient
    .from("prenotazioni")
    .insert([{
      ID_Prenotazione: "PRE" + Date.now(),
      ID_Cliente: idCliente,
      ID_Lezione: idLezione
    }])
    .select();

  if (error) {
    console.error(error);
    setStatus("Errore salvataggio prenotazione", "err");
    return;
  }

  if (!data || !data.length) {
    setStatus("Prenotazione non restituita da Supabase: controlla le policy RLS", "err");
    return;
  }

  document.getElementById("select_cliente").value = "";
  document.getElementById("select_lezione").value = "";

  await loadPrenotazioni();
  setStatus("Prenotazione salvata correttamente ✅", "ok");
}

async function eliminaPrenotazione(id) {
  if (!confirm("Eliminare prenotazione?")) return;

  const { error } = await supabaseClient
    .from("prenotazioni")
    .delete()
    .eq("ID_Prenotazione", id);

  if (error) {
    console.error(error);
    setStatus("Errore eliminazione prenotazione", "err");
    return;
  }

  await loadPrenotazioni();
  setStatus("Prenotazione eliminata correttamente ✅", "ok");
}

// ---------------- UTILS ----------------
function safe(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeQuote(value) {
  if (value === null || value === undefined) return "";
  return String(value).replaceAll("'", "\\'");
}

function escapeHtmlAttr(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
