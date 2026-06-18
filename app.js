const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";


const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MAX_PARTECIPANTI = {
  "Privata": 1,
  "Duetto": 2,
  "Mini-Gruppo": 4
};

let clientiData = [];
let lezioniData = [];
let prenotazioniData = [];

window.addEventListener("DOMContentLoaded", async () => {
  try {
    generaOrari();
    await reloadAll();
    setStatus("Dashboard caricata correttamente ✅", "ok");
  } catch (error) {
    console.error("Errore inizializzazione:", error);
    setStatus("Errore inizializzazione dashboard. Controlla la console F12.", "err");
  }
});

function setStatus(message, type = "ok") {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = message || "";
  el.style.color = type === "err" ? "#b00020" : "#0a7a33";
}

async function reloadAll() {
  await loadClienti();
  await loadLezioni();
  await loadPrenotazioni();
  renderLezioni();
  renderPrenotazioni();
}

function generaOrari() {
  const sel = document.getElementById("new_ora");
  if (!sel) return;

  sel.innerHTML = '<option value="">Ora</option>';

  for (let h = 7; h <= 21; h++) {
    for (const m of [0, 30]) {
      const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      sel.appendChild(opt);
    }
  }
}

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

function togglePrenotazioni() {
  const el = document.getElementById("prenotazioniSection");
  if (!el) return;
  el.classList.toggle("hidden");
}

async function loadClienti() {
  const { data, error } = await supabaseClient
    .from("clienti")
    .select("ID_Cliente, Nome, Cognome, Telefono, Email, Indirizzo, Cittá, CAP, Codice_Fiscale, Data_Registrazione")
    .order("Nome", { ascending: true });

  if (error) {
    console.error("Errore loadClienti:", error);
    setStatus("Errore caricamento clienti", "err");
    return;
  }

  clientiData = data || [];
  renderClienti();
  renderSelectClienti();
}

function renderClienti() {
  const out = document.getElementById("outputClienti");
  if (!out) return;

  out.innerHTML = `
    <table>
      <tr>
        <th>ID_Cliente</th>
        <th>Nome</th>
        <th>Cognome</th>
        <th>Telefono</th>
        <th>Email</th>
        <th>Indirizzo</th>
        <th>Cittá</th>
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
  const sel = document.getElementById("select_cliente");
  if (!sel) return;

  sel.innerHTML = '<option value="">Seleziona cliente</option>' + clientiData.map(c =>
    `<option value="${escapeAttr(c.ID_Cliente)}">${safe(c.Nome)} ${safe(c.Cognome)}</option>`
  ).join("");
}

async function aggiungiCliente() {
  const payload = {
    ID_Cliente: "CL" + Date.now(),
    Nome: document.getElementById("new_nome")?.value.trim() || "",
    Cognome: document.getElementById("new_cognome")?.value.trim() || "",
    Telefono: document.getElementById("new_telefono")?.value.trim() || "",
    Email: document.getElementById("new_email")?.value.trim() || "",
    Indirizzo: document.getElementById("new_indirizzo")?.value.trim() || "",
    Cittá: document.getElementById("new_citta")?.value.trim() || "",
    CAP: document.getElementById("new_cap")?.value.trim() || "",
    Codice_Fiscale: document.getElementById("new_cf")?.value.trim() || "",
    Data_Registrazione: new Date().toISOString().split("T")[0]
  };

  if (!payload.Nome || !payload.Cognome) {
    setStatus("Nome e Cognome sono obbligatori", "err");
    return;
  }

  const { error } = await supabaseClient.from("clienti").insert([payload]);
  if (error) {
    console.error("Errore aggiungiCliente:", error);
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

  const Nome = prompt("Nome", cliente.Nome || "");
  if (Nome === null) return;
  const Cognome = prompt("Cognome", cliente.Cognome || "");
  if (Cognome === null) return;
  const Telefono = prompt("Telefono", cliente.Telefono || "");
  if (Telefono === null) return;
  const Email = prompt("Email", cliente.Email || "");
  if (Email === null) return;
  const Indirizzo = prompt("Indirizzo", cliente.Indirizzo || "");
  if (Indirizzo === null) return;
  const Cittá = prompt("Cittá", cliente["Cittá"] || "");
  if (Cittá === null) return;
  const CAP = prompt("CAP", cliente.CAP || "");
  if (CAP === null) return;
  const Codice_Fiscale = prompt("Codice Fiscale", cliente.Codice_Fiscale || "");
  if (Codice_Fiscale === null) return;

  const { error } = await supabaseClient
    .from("clienti")
    .update({ Nome, Cognome, Telefono, Email, Indirizzo, Cittá, CAP, Codice_Fiscale })
    .eq("ID_Cliente", id);

  if (error) {
    console.error("Errore modificaCliente:", error);
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
    console.error("Errore eliminaCliente:", error);
    setStatus("Errore eliminazione cliente", "err");
    return;
  }

  await loadClienti();
  await loadPrenotazioni();
  setStatus("Cliente eliminato correttamente ✅", "ok");
}

function pulisciFormCliente() {
  const ids = ["new_nome", "new_cognome", "new_telefono", "new_email", "new_indirizzo", "new_citta", "new_cap", "new_cf"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

async function loadLezioni() {
  const { data, error } = await supabaseClient
    .from("lezioni")
    .select("ID_Lezione, Data, Ora, Tipologia, Istruttore, Max_Partecipanti")
    .order("Data", { ascending: true })
    .order("Ora", { ascending: true });

  if (error) {
    console.error("Errore loadLezioni:", error);
    setStatus("Errore caricamento lezioni", "err");
    return;
  }

  lezioniData = data || [];
  renderLezioni();
  renderSelectLezioni();
}

function renderLezioni() {
  const out = document.getElementById("outputLezioni");
  if (!out) return;

  out.innerHTML = `
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
        const rimasti = Math.max(Number(l.Max_Partecipanti || 0) - prenotati, 0);
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
  const sel = document.getElementById("select_lezione");
  if (!sel) return;

  sel.innerHTML = '<option value="">Seleziona lezione</option>' + lezioniData.map(l => {
    const prenotati = prenotazioniData.filter(p => String(p.ID_Lezione) === String(l.ID_Lezione)).length;
    return `<option value="${escapeAttr(l.ID_Lezione)}">${safe(l.Data)} ${safe(l.Ora)} - ${safe(l.Tipologia)} (${prenotati}/${safe(l.Max_Partecipanti)})</option>`;
  }).join("");
}

async function aggiungiLezione() {
  const Tipologia = document.getElementById("new_tipologia")?.value || "";
  const payload = {
    ID_Lezione: "LEZ" + Date.now(),
    Data: document.getElementById("new_data")?.value || "",
    Ora: document.getElementById("new_ora")?.value || "",
    Tipologia,
    Istruttore: document.getElementById("new_istruttore")?.value.trim() || "",
    Max_Partecipanti: MAX_PARTECIPANTI[Tipologia]
  };

  if (!payload.Data || !payload.Ora || !payload.Tipologia || !payload.Istruttore) {
    setStatus("Compila tutti i campi della lezione", "err");
    return;
  }

  const { error } = await supabaseClient.from("lezioni").insert([payload]);
  if (error) {
    console.error("Errore aggiungiLezione:", error);
    setStatus("Errore salvataggio lezione", "err");
    return;
  }

  pulisciFormLezione();
  await loadLezioni();
  await loadPrenotazioni();
  setStatus("Lezione salvata correttamente ✅", "ok");
}

async function eliminaLezione(id) {
  if (!confirm("Eliminare la lezione e le prenotazioni collegate?")) return;

  const { error: deletePrenError } = await supabaseClient
    .from("prenotazioni")
    .delete()
    .eq("ID_Lezione", id);

  if (deletePrenError) {
    console.error("Errore delete prenotazioni collegate:", deletePrenError);
    setStatus("Errore eliminazione prenotazioni collegate", "err");
    return;
  }

  const { error } = await supabaseClient
    .from("lezioni")
    .delete()
    .eq("ID_Lezione", id);

  if (error) {
    console.error("Errore eliminaLezione:", error);
    setStatus("Errore eliminazione lezione", "err");
    return;
  }

  await loadLezioni();
  await loadPrenotazioni();
  setStatus("Lezione eliminata correttamente ✅", "ok");
}

function pulisciFormLezione() {
  const ids = ["new_data", "new_ora", "new_tipologia", "new_istruttore"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

async function loadPrenotazioni() {
  const { data, error } = await supabaseClient
    .from("prenotazioni")
    .select("ID_Prenotazione, ID_Cliente, ID_Lezione")
    .order("ID_Prenotazione", { ascending: true });

  if (error) {
    console.error("Errore loadPrenotazioni:", error);
    setStatus("Errore caricamento prenotazioni", "err");
    return;
  }

  prenotazioniData = data || [];
  renderPrenotazioni();
  renderLezioni();
  renderSelectLezioni();
}

function renderPrenotazioni() {
  const out = document.getElementById("outputPrenotazioni");
  if (!out) return;

  out.innerHTML = `
    <table>
      <tr>
        <th>ID_Prenotazione</th>
        <th>ID_Cliente</th>
        <th>Cliente</th>
        <th>ID_Lezione</th>
        <th>Data</th>
        <th>Ora</th>
        <th>Tipologia</th>
        <th>Istruttore</th>
        <th>Azioni</th>
      </tr>
      ${prenotazioniData.map(p => {
        const cliente = clientiData.find(c => String(c.ID_Cliente) === String(p.ID_Cliente));
        const lezione = lezioniData.find(l => String(l.ID_Lezione) === String(p.ID_Lezione));
        return `
          <tr>
            <td>${safe(p.ID_Prenotazione)}</td>
            <td>${safe(p.ID_Cliente)}</td>
            <td>${cliente ? `${safe(cliente.Nome)} ${safe(cliente.Cognome)}` : ""}</td>
            <td>${safe(p.ID_Lezione)}</td>
            <td>${lezione ? safe(lezione.Data) : "⚠️ NO LEZIONE"}</td>
            <td>${lezione ? safe(lezione.Ora) : ""}</td>
            <td>${lezione ? safe(lezione.Tipologia) : ""}</td>
            <td>${lezione ? safe(lezione.Istruttore) : ""}</td>

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
  const idCliente = document.getElementById("select_cliente")?.value || "";
  const idLezione = document.getElementById("select_lezione")?.value || "";

  console.log("Cliente selezionato:", idCliente);
  console.log("Lezione selezionata:", idLezione);

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
    console.error("Lezione non trovata in lezioniData:", lezioniData, idLezione);
    setStatus("Lezione non trovata", "err");
    return;
  }

  const count = prenotazioniData.filter(p => String(p.ID_Lezione) === String(idLezione)).length;
  if (count >= Number(lezione.Max_Partecipanti || 0)) {
    setStatus("Lezione piena", "err");
    return;
  }

  const response = await supabaseClient
    .from("prenotazioni")
    .insert([{
      ID_Prenotazione: "PRE" + Date.now(),
      ID_Cliente: idCliente,
      ID_Lezione: idLezione
    }])
    .select();

  console.log("Risposta insert prenotazioni:", response);

  if (response.error) {
    console.error("Errore prenota:", response.error);
    setStatus(`Errore salvataggio prenotazione: ${response.error.message}`, "err");
    return;
  }

  if (!response.data || !response.data.length) {
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
    console.error("Errore eliminaPrenotazione:", error);
    setStatus("Errore eliminazione prenotazione", "err");
    return;
  }

  await loadPrenotazioni();
  setStatus("Prenotazione eliminata correttamente ✅", "ok");
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

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

function escapeAttr(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
