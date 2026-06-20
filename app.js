const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";


const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const APP_VERSION = "v-step4-filtri-data-2026-06-19";

const MAX_PARTECIPANTI = {
  "Privata": 1,
  "Duetto": 2,
  "Mini-Gruppo": 4
};

const RIGHE_PER_PAGINA = 25;

let clientiData = [];
let lezioniData = [];
let prenotazioniData = [];

let paginaLezioni = 1;
let paginaPrenotazioni = 1;

let filtroLezioni = "tutte";
let filtroLezioniData = "";

let filtroPrenotazioni = "tutte";
let filtroPrenotazioniData = "";
let searchPrenotazioni = "";


window.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("APP VERSION:", APP_VERSION);
    generaOrari();
    await reloadAll();

    // apertura iniziale stile app
    setTimeout(() => {
      vaiTab("clienti");
    }, 150);

    setStatus("Dashboard caricata correttamente ✅ - " + APP_VERSION, "ok");
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

function toggleNuovoCliente() {
  const box = document.getElementById("nuovoClienteBox");
  if (!box) return;

  box.classList.toggle("hidden");

  if (!box.classList.contains("hidden")) {
    box.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


async function reloadAll() {
  await loadClienti();
  await loadLezioni();
  await loadPrenotazioni();
}

async function fetchAllRows(tableName, columns = "*", orderColumn = null, ascending = true) {
  const pageSize = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    let query = supabaseClient
      .from(tableName)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (orderColumn) {
      query = query.order(orderColumn, { ascending });
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const rows = data || [];
    allRows = allRows.concat(rows);

    if (rows.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return { data: allRows, error: null };
}

/* ===================== DATE UTILS ===================== */

function getTodayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekRangeStrings() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: formatDateLocal(monday),
    end: formatDateLocal(sunday)
  };
}

function formatDateLocal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isDateInCurrentWeek(dateString) {
  if (!dateString) return false;
  const range = getWeekRangeStrings();
  return dateString >= range.start && dateString <= range.end;
}

function filtraPerData(dateString, tipoFiltro, dataSpecifica) {
  const oggi = getTodayString();

  if (tipoFiltro === "tutte") return true;
  if (!dateString) return false;

  if (tipoFiltro === "oggi") {
    return dateString === oggi;
  }

  if (tipoFiltro === "settimana") {
    return isDateInCurrentWeek(dateString);
  }

  if (tipoFiltro === "future") {
    return dateString >= oggi;
  }

  if (tipoFiltro === "passate") {
    return dateString < oggi;
  }

  if (tipoFiltro === "data") {
    return dateString === dataSpecifica;
  }

  return true;
}

/* ===================== UX ANIMAZIONI ===================== */

function isMobile() {
  return window.innerWidth <= 768;
}

function animateView(container, html, direction = "forward") {
  if (!container) return;

  // desktop → niente animazioni
  if (!isMobile()) {
    container.innerHTML = html;
    container.classList.remove("hidden");
    return;
  }

  container.classList.remove("hidden");
  container.classList.add("app-view");

  container.innerHTML = html;

  requestAnimationFrame(() => {
    container.classList.remove("view-enter", "view-exit", "view-back-enter");
    container.classList.add(
      direction === "back" ? "view-back-enter" : "view-enter"
    );
  });

  container.scrollIntoView({ behavior: "smooth" });
}

function closeAnimated(container) {
  if (!container) return;

  if (!isMobile()) {
    container.innerHTML = "";
    container.classList.add("hidden");
    return;
  }

  container.classList.add("view-exit");

  setTimeout(() => {
    container.innerHTML = "";
    container.classList.add("hidden");
    container.classList.remove("view-exit");
  }, 180);
}

/* ===================== CLIENTI ===================== */

async function loadClienti() {
  const { data, error } = await fetchAllRows(
    "clienti",
    "ID_Cliente, Nome, Cognome, Telefono, Email, Indirizzo, Cittá, CAP, Codice_Fiscale, Data_Registrazione",
    "ID_Cliente",
    true
  );

  if (error) {
    console.error("Errore loadClienti:", error);
    setStatus(`Errore caricamento clienti: ${error.message}`, "err");
    return;
  }

  clientiData = data || [];
  
  // ✅ ORDINA PER Nome → Cognome
clientiData.sort((a, b) => {
  const nomeA = (a.Nome || "").toLowerCase();
  const nomeB = (b.Nome || "").toLowerCase();

  if (nomeA < nomeB) return -1;
  if (nomeA > nomeB) return 1;

  const cognomeA = (a.Cognome || "").toLowerCase();
  const cognomeB = (b.Cognome || "").toLowerCase();

  if (cognomeA < cognomeB) return -1;
  if (cognomeA > cognomeB) return 1;

  return 0;
});

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
  
setTimeout(() => {
  renderClientiMobileSafe();
}, 50);

}

function renderSelectClienti() {
  const sel = document.getElementById("select_cliente");
  if (!sel) return;

  sel.innerHTML =
    '<option value="">Seleziona cliente</option>' +
    clientiData.map(c =>
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
  document.getElementById("nuovoClienteBox")?.classList.add("hidden");
  }

  const { error } = await supabaseClient.from("clienti").insert([payload]);

  if (error) {
    console.error("Errore aggiungiCliente:", error);
    setStatus(`Errore salvataggio cliente: ${error.message}`, "err");
    return;
  }

  pulisciFormCliente();

const nuovoClienteBox = document.getElementById("nuovoClienteBox");
if (nuovoClienteBox) {
  nuovoClienteBox.classList.add("hidden");
}

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
    setStatus(`Errore modifica cliente: ${error.message}`, "err");
    return;
  }

  await loadClienti();
  await loadPrenotazioni();
  mostraSchedaCliente(id);
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
    setStatus(`Errore eliminazione cliente: ${error.message}`, "err");
    return;
  }

  await loadClienti();
  await loadPrenotazioni();
  setStatus("Cliente eliminato correttamente ✅", "ok");
}

function pulisciFormCliente() {
  [
    "new_nome",
    "new_cognome",
    "new_telefono",
    "new_email",
    "new_indirizzo",
    "new_citta",
    "new_cap",
    "new_cf"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

/* ===================== LEZIONI ===================== */

async function loadLezioni() {
  const { data, error } = await fetchAllRows(
    "lezioni",
    "ID_Lezione, Data, Ora, Tipologia, Istruttore, Max_Partecipanti",
    "Data",
    false
  );

  if (error) {
    console.error("Errore loadLezioni:", error);
    setStatus(`Errore caricamento lezioni: ${error.message}`, "err");
    return;
  }

  lezioniData = data || [];

  lezioniData.sort((a, b) => {
    const dataOraA = `${a.Data || ""} ${a.Ora || ""}`;
    const dataOraB = `${b.Data || ""} ${b.Ora || ""}`;
    return dataOraB.localeCompare(dataOraA);
  });

  paginaLezioni = 1;
  renderLezioni();
  renderLezioniMobileSafe();
  renderSelectLezioni();
}

function getLezioniFiltrate() {
  return lezioniData.filter(l => filtraPerData(l.Data, filtroLezioni, filtroLezioniData));
}

function setFiltroLezioni(tipo) {
  filtroLezioni = tipo;
  filtroLezioniData = "";

  const input = document.getElementById("filtro_lezioni_data");
  if (input) input.value = "";

  paginaLezioni = 1;
  renderLezioni();
}

function setFiltroLezioniData() {
  const input = document.getElementById("filtro_lezioni_data");
  filtroLezioniData = input ? input.value : "";
  filtroLezioni = filtroLezioniData ? "data" : "tutte";

  paginaLezioni = 1;
  renderLezioni();
}

function resetFiltroLezioni() {
  filtroLezioni = "tutte";
  filtroLezioniData = "";

  const input = document.getElementById("filtro_lezioni_data");
  if (input) input.value = "";

  paginaLezioni = 1;
  renderLezioni();
}

function renderLezioni() {
  const out = document.getElementById("outputLezioni");
  if (!out) return;

  const lezioniFiltrate = getLezioniFiltrate();

  const totalePagine = Math.max(1, Math.ceil(lezioniFiltrate.length / RIGHE_PER_PAGINA));
  if (paginaLezioni > totalePagine) paginaLezioni = totalePagine;

  const start = (paginaLezioni - 1) * RIGHE_PER_PAGINA;
  const end = start + RIGHE_PER_PAGINA;
  const lezioniPagina = lezioniFiltrate.slice(start, end);

  const navigazione = `
    <div style="margin-top:10px; margin-bottom:10px;">
      <button onclick="paginaLezioniPrecedente()" ${paginaLezioni === 1 ? "disabled" : ""}>Precedente</button>
      <span>Pagina ${paginaLezioni} di ${totalePagine} — Lezioni filtrate: ${lezioniFiltrate.length} / Totale: ${lezioniData.length}</span>
      <button onclick="paginaLezioniSuccessiva()" ${paginaLezioni === totalePagine ? "disabled" : ""}>Successiva</button>
    </div>
  `;

  out.innerHTML = `
    ${navigazione}
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
      ${lezioniPagina.map(l => {
        const prenotati = prenotazioniData.filter(p => String(p.ID_Lezione) === String(l.ID_Lezione)).length;
        const max = Number(l.Max_Partecipanti || 0);
        const rimasti = Math.max(max - prenotati, 0);

        let statoColore = "🟢";
        let statoTesto = "";

        if (prenotati === 0) {
          statoColore = "🟢";
        } else if (prenotati < max) {
          statoColore = "🟡";
        } else {
          statoColore = "🔴";
          statoTesto = " PIENA";
        }

        const tipologiaConStato = `${safe(l.Tipologia)} (${prenotati}/${max}) ${statoColore}${statoTesto}`;

        return `
          <tr>
            <td>${safe(l.ID_Lezione)}</td>
            <td>${safe(l.Data)}</td>
            <td>${safe(l.Ora)}</td>
            <td>${tipologiaConStato}</td>
            <td>${safe(l.Istruttore)}</td>
            <td>${safe(l.Max_Partecipanti)}</td>
            <td>${prenotati}</td>
            <td>${rimasti}</td>
            
            <td>
            <button onclick="mostraDettaglioLezione('${escapeQuote(l.ID_Lezione)}')">🔎 Dettaglio</button>
            <button onclick="apriPrenotazione('${escapeQuote(l.ID_Lezione)}')">📅 Prenota</button>
            <button onclick="mostraPrenotazioniLezione('${escapeQuote(l.ID_Lezione)}')">👥 Lista</button>
            <br>
            <button onclick="eliminaLezione('${escapeQuote(l.ID_Lezione)}')">Elimina</button>
            </td>
            
          </tr>
        `;
      }).join("")}
    </table>
    ${navigazione}
  `;

setTimeout(() => {
  renderLezioniMobileSafe();
}, 50);

}

function paginaLezioniPrecedente() {
  if (paginaLezioni > 1) {
    paginaLezioni--;
    renderLezioni();
  }
}

function paginaLezioniSuccessiva() {
  const totalePagine = Math.max(1, Math.ceil(getLezioniFiltrate().length / RIGHE_PER_PAGINA));
  if (paginaLezioni < totalePagine) {
    paginaLezioni++;
    renderLezioni();
  }
}

function renderSelectLezioni() {
  const sel = document.getElementById("select_lezione");
  if (!sel) return;

  sel.innerHTML =
    '<option value="">Seleziona lezione</option>' +
    lezioniData.map(l => {
      const prenotati = prenotazioniData.filter(p =>
        String(p.ID_Lezione) === String(l.ID_Lezione)
      ).length;

      const max = Number(l.Max_Partecipanti || 0);
      const piena = prenotati >= max;

      return `
        <option 
          value="${escapeAttr(l.ID_Lezione)}" 
          ${piena ? "disabled style='color:red;'" : ""}
        >
          ${safe(l.Data)} ${safe(l.Ora)} - ${safe(l.Tipologia)}
          (${prenotati}/${max})
          ${piena ? "🔴 PIENA" : ""}
        </option>
      `;
    }).join("");
}

async function aggiungiLezione() {
  const Tipologia = document.getElementById("new_tipologia")?.value || "";

  const payload = {
    ID_Lezione: "LZ" + Date.now(),
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
    setStatus(`Errore salvataggio lezione: ${error.message}`, "err");
    return;
  }

  pulisciFormLezione();
  await loadLezioni();
  await loadPrenotazioni();
  setStatus("Lezione salvata correttamente ✅", "ok");
}

async function eliminaLezione(id) {
  if (!confirm("Eliminare la lezione e le prenotazioni collegate?")) return;

  const { error: errorPren } = await supabaseClient
    .from("prenotazioni")
    .delete()
    .eq("ID_Lezione", id);

  if (errorPren) {
    console.error("Errore eliminazione prenotazioni collegate:", errorPren);
    setStatus(`Errore eliminazione prenotazioni collegate: ${errorPren.message}`, "err");
    return;
  }

  const { error } = await supabaseClient
    .from("lezioni")
    .delete()
    .eq("ID_Lezione", id);

  if (error) {
    console.error("Errore eliminaLezione:", error);
    setStatus(`Errore eliminazione lezione: ${error.message}`, "err");
    return;
  }

  await loadLezioni();
  await loadPrenotazioni();
  setStatus("Lezione eliminata correttamente ✅", "ok");
}

function pulisciFormLezione() {
  [
    "new_data",
    "new_ora",
    "new_tipologia",
    "new_istruttore"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

/* ===================== PRENOTAZIONI ===================== */

async function loadPrenotazioni() {
  const { data, error } = await fetchAllRows(
    "prenotazioni",
    "ID_Prenotazione, ID_Cliente, ID_Lezione",
    "ID_Prenotazione",
    false
  );

  if (error) {
    console.error("Errore loadPrenotazioni:", error);
    setStatus(`Errore caricamento prenotazioni: ${error.message}`, "err");
    return;
  }

  prenotazioniData = data || [];

  prenotazioniData.sort((a, b) => {
    return String(b.ID_Prenotazione || "").localeCompare(String(a.ID_Prenotazione || ""));
  });

  paginaPrenotazioni = 1;
  renderPrenotazioni();
  renderLezioni();
  renderSelectLezioni();
}

function getPrenotazioniFiltrate() {
  return prenotazioniData.filter(p => {

    // ✅ recupero cliente e lezione
    const cliente = clientiData.find(c => String(c.ID_Cliente) === String(p.ID_Cliente));
    const lezione = lezioniData.find(l => String(l.ID_Lezione) === String(p.ID_Lezione));

    const dataLezione = lezione ? lezione.Data : "";

    // ✅ filtro per data (già esistente)
    const passaFiltroData = filtraPerData(dataLezione, filtroPrenotazioni, filtroPrenotazioniData);

    // ✅ filtro ricerca cliente
    return passaFiltroData;
    
  });
}

function setFiltroPrenotazioni(tipo) {
  filtroPrenotazioni = tipo;
  filtroPrenotazioniData = "";

  const input = document.getElementById("filtro_prenotazioni_data");
  if (input) input.value = "";

  paginaPrenotazioni = 1;
  renderPrenotazioni();
}

function setFiltroPrenotazioniData() {
  const input = document.getElementById("filtro_prenotazioni_data");
  filtroPrenotazioniData = input ? input.value : "";
  filtroPrenotazioni = filtroPrenotazioniData ? "data" : "tutte";

  paginaPrenotazioni = 1;
  renderPrenotazioni();
}

function resetFiltroPrenotazioni() {
  filtroPrenotazioni = "tutte";
  filtroPrenotazioniData = "";

  const input = document.getElementById("filtro_prenotazioni_data");
  if (input) input.value = "";

  paginaPrenotazioni = 1;
  renderPrenotazioni();
}

function renderPrenotazioni() {
  const out = document.getElementById("outputPrenotazioni");
  if (!out) return;

  const prenotazioniFiltrate = getPrenotazioniFiltrate();

  const totalePagine = Math.max(1, Math.ceil(prenotazioniFiltrate.length / RIGHE_PER_PAGINA));
  if (paginaPrenotazioni > totalePagine) paginaPrenotazioni = totalePagine;

  const start = (paginaPrenotazioni - 1) * RIGHE_PER_PAGINA;
  const end = start + RIGHE_PER_PAGINA;
  const prenotazioniPagina = prenotazioniFiltrate.slice(start, end);

  const navigazione = `
    <div style="margin-top:10px; margin-bottom:10px;">
      <button onclick="paginaPrenotazioniPrecedente()" ${paginaPrenotazioni === 1 ? "disabled" : ""}>Precedente</button>
      <span>Pagina ${paginaPrenotazioni} di ${totalePagine} — Prenotazioni filtrate: ${prenotazioniFiltrate.length} / Totale: ${prenotazioniData.length}</span>
      <button onclick="paginaPrenotazioniSuccessiva()" ${paginaPrenotazioni === totalePagine ? "disabled" : ""}>Successiva</button>
    </div>
  `;

  out.innerHTML = `
    ${navigazione}
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
      ${prenotazioniPagina.map(p => {
        const cliente = clientiData.find(c => String(c.ID_Cliente) === String(p.ID_Cliente));
        const lezione = lezioniData.find(l => String(l.ID_Lezione) === String(p.ID_Lezione));

        return `
          <tr>
            <td>${safe(p.ID_Prenotazione)}</td>
            <td>${safe(p.ID_Cliente)}</td>
            <td>
              ${
                cliente
                  ? `<button onclick="mostraStoricoCliente('${escapeQuote(cliente.ID_Cliente)}')">
                      ${safe(cliente.Nome)} ${safe(cliente.Cognome)}
                    </button>`
                  : ""
              }
            </td>
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
    ${navigazione}
  `;
  
  setTimeout(() => {
  renderPrenotazioniMobileSafe();
}, 50);
  
}

function paginaPrenotazioniPrecedente() {
  if (paginaPrenotazioni > 1) {
    paginaPrenotazioni--;
    renderPrenotazioni();
  }
}

function paginaPrenotazioniSuccessiva() {
  const totalePagine = Math.max(1, Math.ceil(getPrenotazioniFiltrate().length / RIGHE_PER_PAGINA));
  if (paginaPrenotazioni < totalePagine) {
    paginaPrenotazioni++;
    renderPrenotazioni();
  }
}

async function prenota() {
  const idCliente = document.getElementById("select_cliente")?.value || "";
  const idLezione = document.getElementById("select_lezione")?.value || "";

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

  if (count >= Number(lezione.Max_Partecipanti || 0)) {
    setStatus("Lezione piena", "err");
    return;
  }

  const response = await supabaseClient
    .from("prenotazioni")
    .insert([{
      ID_Prenotazione: "PR" + Date.now(),
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
    setStatus(`Errore eliminazione prenotazione: ${error.message}`, "err");
    return;
  }

  await loadPrenotazioni();
  setStatus("Prenotazione eliminata correttamente ✅", "ok");
}

function mostraStoricoCliente(idCliente) {
  const out = document.getElementById("outputStoricoCliente");
  if (!out) return;

  const cliente = clientiData.find(c => String(c.ID_Cliente) === String(idCliente));

  if (!cliente) {
    out.innerHTML = `<p class="muted">Cliente non trovato.</p>`;
    return;
  }

  const storico = prenotazioniData
    .filter(p => String(p.ID_Cliente) === String(idCliente))
    .map(p => {
      const lezione = lezioniData.find(l => String(l.ID_Lezione) === String(p.ID_Lezione));

      return {
        ID_Prenotazione: p.ID_Prenotazione,
        ID_Cliente: p.ID_Cliente,
        ID_Lezione: p.ID_Lezione,
        Data: lezione ? lezione.Data : "",
        Ora: lezione ? lezione.Ora : "",
        Tipologia: lezione ? lezione.Tipologia : "",
        Istruttore: lezione ? lezione.Istruttore : "",
        lezioneTrovata: !!lezione
      };
    })
    .sort((a, b) => {
      const dataOraA = `${a.Data || ""} ${a.Ora || ""}`;
      const dataOraB = `${b.Data || ""} ${b.Ora || ""}`;
      return dataOraB.localeCompare(dataOraA);
    });

  out.innerHTML = `
    <div style="margin-top:10px; margin-bottom:10px;">
      <strong>Cliente:</strong> ${safe(cliente.Nome)} ${safe(cliente.Cognome)}<br>
      <strong>ID_Cliente:</strong> ${safe(cliente.ID_Cliente)}<br>
      <strong>Telefono:</strong> ${safe(cliente.Telefono)}<br>
      <strong>Email:</strong> ${safe(cliente.Email)}<br>
      <strong>Totale prenotazioni:</strong> ${storico.length}
      <br>
      <button onclick="resetStoricoCliente()">Chiudi storico</button>
    </div>

    <table>
      <tr>
        <th>ID_Prenotazione</th>
        <th>ID_Lezione</th>
        <th>Data</th>
        <th>Ora</th>
        <th>Tipologia</th>
        <th>Istruttore</th>
        <th>Stato</th>
      </tr>

      ${
        storico.length
          ? storico.map(s => `
              <tr>
                <td>${safe(s.ID_Prenotazione)}</td>
                <td>${safe(s.ID_Lezione)}</td>
                <td>${s.lezioneTrovata ? safe(s.Data) : "⚠️ NO LEZIONE"}</td>
                <td>${safe(s.Ora)}</td>
                <td>${safe(s.Tipologia)}</td>
                <td>${safe(s.Istruttore)}</td>
                <td>${s.lezioneTrovata ? "OK" : "Lezione non trovata"}</td>
              </tr>
            `).join("")
          : `
              <tr>
                <td colspan="7">Nessuna prenotazione trovata per questo cliente.</td>
              </tr>
            `
      }
    </table>
  `;
}

function resetStoricoCliente() {
  const out = document.getElementById("outputStoricoCliente");
  if (!out) return;

  out.innerHTML = `
    <p class="muted">Clicca sul nome di un cliente nella tabella prenotazioni per vedere il suo storico.</p>
  `;
}

/* ===================== AUTH ===================== */

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

/* ===================== UTILS ===================== */

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

function applySearchPrenotazioni() {
  const input = document.getElementById("search_prenotazioni");
  searchPrenotazioni = input ? input.value.toLowerCase().trim() : "";

  paginaPrenotazioni = 1;
  renderPrenotazioni();
}

function resetSearchPrenotazioni() {
  searchPrenotazioni = "";

  const input = document.getElementById("search_prenotazioni");
  if (input) input.value = "";

  paginaPrenotazioni = 1;
  renderPrenotazioni();
}

function apriPrenotazione(idLezione) {
  const select = document.getElementById("select_lezione");
  const section = document.getElementById("prenotazioniSection");

  if (select) select.value = idLezione;

  if (section && section.classList.contains("hidden")) {
    section.classList.remove("hidden");
  }

  window.scrollTo({
    top: section.offsetTop - 20,
    behavior: "smooth"
  });
}

function mostraPrenotazioniLezione(idLezione) {
  const out = document.getElementById("outputStoricoCliente"); // riusiamo lo stesso blocco

  if (!out) return;

  const lista = prenotazioniData
    .filter(p => String(p.ID_Lezione) === String(idLezione))
    .map(p => {
      const cliente = clientiData.find(c => String(c.ID_Cliente) === String(p.ID_Cliente));

      return {
        nome: cliente ? cliente.Nome + " " + cliente.Cognome : "Cliente non trovato",
        id: p.ID_Prenotazione
      };
    });

  out.innerHTML = `
    <h4>Prenotazioni Lezione ${safe(idLezione)}</h4>

    <table>
      <tr>
        <th>ID_Prenotazione</th>
        <th>Cliente</th>
      </tr>

      ${
        lista.length
          ? lista.map(x => `
              <tr>
                <td>${safe(x.id)}</td>
                <td>${safe(x.nome)}</td>
              </tr>
            `).join("")
          : `<tr><td colspan="2">Nessuna prenotazione</td></tr>`
      }
    </table>
  `;
}

function renderLezioniMobileSafe() {
  try {
    if (window.innerWidth > 768) return;

    const out = document.getElementById("outputLezioni");
    if (!out) return;

    const table = out.querySelector("table");
    if (!table) return;

    const rows = table.querySelectorAll("tr");
    if (!rows || rows.length <= 1) return;

    const cards = [];

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll("td");
      if (!cells || cells.length < 9) continue;

      const idLezione = cells[0].innerText;
      const data = cells[1].innerText;
      const ora = cells[2].innerText;
      const tipologia = cells[3].innerText;
      const istruttore = cells[4].innerText;
      const max = cells[5].innerText;
      const prenotati = cells[6].innerText;
      const rimasti = cells[7].innerText;
      let colore = "#34c759"; // verde
      if (Number(prenotati) >= Number(max)) colore = "#ff3b30";
      else if (Number(prenotati) > 0) colore = "#ffcc00";
      const azioni = `
  <button onclick="mostraDettaglioLezione('${escapeQuote(idLezione)}')">🔎 Dettaglio</button>
  <button onclick="apriPrenotazione('${escapeQuote(idLezione)}')">📅 Prenota</button>
  <button onclick="eliminaLezione('${escapeQuote(idLezione)}')">Elimina</button>
`;


      cards.push(`
  <div class="card-ios">

    <div class="card-title">
      📅 ${data} - ${ora}
    </div>

    
<div class="card-sub" style="color:${colore}; font-weight:600;">
  ${tipologia}
</div>


    <div class="card-sub">
      👤 ${istruttore}
    </div>

    <div class="card-row">
      👥 ${prenotati}/${max} • Rimasti: ${rimasti}
    </div>

    <div class="card-actions">
      ${azioni}
    </div>

  </div>
`);
      
    }

    if (cards.length > 0) {
      out.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${cards.join("")}
        </div>
      `;
    }

  } catch (err) {
    console.error("Errore renderLezioniMobileSafe:", err);
  }
}

function renderClientiMobileSafe() {
  try {
    if (window.innerWidth > 768) return;

    const out = document.getElementById("outputClienti");
    if (!out) return;

    const table = out.querySelector("table");
    if (!table) return;

    const rows = table.querySelectorAll("tr");
    if (!rows || rows.length <= 1) return;

    const cards = [];

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll("td");
      if (!cells || cells.length < 11) continue;

      const id = cells[0].innerText;
      const nome = cells[1].innerText;
      const cognome = cells[2].innerText;
      const telefono = cells[3].innerText;
      const email = cells[4].innerText;
      const azioni = cells[10].innerHTML;

      cards.push(`
        <div class="card-ios">

          <div class="card-title">
            ${nome} ${cognome}
          </div>

          <div class="card-sub">
            📞 ${telefono}
          </div>

          <div class="card-sub">
            📧 ${email}
          </div>

          <div class="card-actions">
            <button onclick="mostraSchedaCliente('${escapeQuote(id)}')">🔎 Scheda</button>
            <button onclick="mostraPrenotazioniCliente('${escapeQuote(id)}')">📅 Prenotazioni</button>
            ${azioni}
          </div>

        </div>
      `);
    }

    if (cards.length > 0) {
      out.innerHTML = cards.join("");
    }

  } catch (err) {
    console.error("Errore renderClientiMobileSafe:", err);
  }
}

function renderPrenotazioniMobileSafe() {

  try {

    if (window.innerWidth > 768) return;

    const out = document.getElementById("outputPrenotazioni");
    if (!out) return;

    const table = out.querySelector("table");
    if (!table) return;

    const rows = table.querySelectorAll("tr");
    if (!rows || rows.length <= 1) return;

    const cards = [];

    for (let i = 1; i < rows.length; i++) {

      const cells = rows[i].querySelectorAll("td");
      if (!cells || cells.length < 9) continue;

      const cliente = cells[2].innerText;
      const data = cells[4].innerText;
      const ora = cells[5].innerText;
      const tipologia = cells[6].innerText;
      const azioni = cells[8].innerHTML;

      cards.push(`
        <div style="border:1px solid #ccc; padding:12px; border-radius:10px; margin-bottom:12px;">
          <div style="font-weight:bold;">
            ${cliente}
          </div>
          <div>📅 ${data} - ${ora}</div>
          <div>${tipologia}</div>


          <div style="margin-top:10px;">
            ${azioni}
          </div>
        </div>
      `);
    }

    if (cards.length > 0) {
      out.innerHTML = cards.join("");
    }

  } catch (err) {
    console.error("Errore renderPrenotazioniMobileSafe:", err);
  }
}

function mostraDettaglioLezione(idLezione) {
  const box = document.getElementById("dettaglioLezioneBox");
  if (!box) return;

  const lezione = lezioniData.find(l => String(l.ID_Lezione) === String(idLezione));
  if (!lezione) return;

  const prenotazioniLezione = prenotazioniData.filter(p =>
    String(p.ID_Lezione) === String(idLezione)
  );

  const max = Number(lezione.Max_Partecipanti || 0);
  const prenotati = prenotazioniLezione.length;

  const clientiHtml = prenotazioniLezione.map(p => {
    const cliente = clientiData.find(c => c.ID_Cliente == p.ID_Cliente);
    return `
      <div class="lesson-client-row">
        ${cliente ? cliente.Nome + " " + cliente.Cognome : "Cliente"}
      </div>
    `;
  }).join("");

  animateView(box, `
    <div class="app-toolbar">
      <button class="app-back-btn" onclick="chiudiDettaglioLezione()">← Lezioni</button>
    </div>

    <div class="lesson-detail">
      <div class="lesson-detail-title">
        ${lezione.Data} - ${lezione.Ora}
      </div>

      <div class="lesson-detail-sub">
        ${lezione.Tipologia} (${prenotati}/${max})
      </div>

      <div class="lesson-detail-sub">
        👤 ${lezione.Istruttore}
      </div>

      <div class="lesson-detail-section">
        ${clientiHtml || "Nessun cliente"}
      </div>

      <div class="lesson-detail-actions">
        <button onclick="chiudiDettaglioLezione()">Chiudi</button>
      </div>
    </div>
  `);
}



function chiudiDettaglioLezione() {
  const box = document.getElementById("dettaglioLezioneBox");
  closeAnimated(box);
}

function mostraSchedaCliente(idCliente) {
  const box = document.getElementById("outputClienti");

  const cliente = clientiData.find(c => c.ID_Cliente == idCliente);
  if (!cliente) return;

  animateView(box, `
  <div class="app-toolbar">
    <button class="app-back-btn" onclick="chiudiDettaglioCliente()">← Clienti</button>
  </div>

  <div style="padding: 12px 12px 80px 12px;">
  
    <div class="card-ios">
      <div class="card-title">
        ${cliente.Nome} ${cliente.Cognome}
      </div>

      <div class="card-sub">📞 ${cliente.Telefono || "-"}</div>
      <div class="card-sub">📧 ${cliente.Email || "-"}</div>
      <div class="card-sub">🏠 ${cliente.Indirizzo || "-"}</div>
      <div class="card-sub">📍 ${cliente["Cittá"] || "-"}</div>
      <div class="card-sub">📮 ${cliente.CAP || "-"}</div>
      <div class="card-sub">🧾 ${cliente.Codice_Fiscale || "-"}</div>

      <div class="card-actions">
        <button onclick="mostraModificaClienteInline('${cliente.ID_Cliente}')">✏️ Modifica</button>
        <button onclick="chiudiDettaglioCliente()">Chiudi</button>
      </div>
    </div>

  </div>
`);
}



function mostraPrenotazioniCliente(idCliente) {
  const box = document.getElementById("outputClienti");
  if (!box) return;

  const cliente = clientiData.find(c => String(c.ID_Cliente) === String(idCliente));

  if (!cliente) {
    box.classList.remove("hidden");
    box.innerHTML = `
      <div class="card-ios">
        <div class="card-title">Cliente non trovato</div>
        <div class="card-actions">
          <button onclick="chiudiDettaglioCliente()">Chiudi</button>
        </div>
      </div>
    `;
    return;
  }

  const storico = prenotazioniData
    .filter(p => String(p.ID_Cliente) === String(idCliente))
    .map(p => {
      const lezione = lezioniData.find(l => String(l.ID_Lezione) === String(p.ID_Lezione));

      return {
        ID_Prenotazione: p.ID_Prenotazione,
        ID_Lezione: p.ID_Lezione,
        Data: lezione ? lezione.Data : "",
        Ora: lezione ? lezione.Ora : "",
        Tipologia: lezione ? lezione.Tipologia : "",
        Istruttore: lezione ? lezione.Istruttore : "",
        lezioneTrovata: !!lezione
      };
    })
    .sort((a, b) => {
      const dataOraA = `${a.Data || ""} ${a.Ora || ""}`;
      const dataOraB = `${b.Data || ""} ${b.Ora || ""}`;
      return dataOraB.localeCompare(dataOraA);
    });

  box.classList.remove("hidden");

  box.innerHTML = `
    <div class="card-ios">

      <div class="card-title">
        📅 Prenotazioni Cliente
      </div>

      <div class="card-sub">
        <strong>Cliente:</strong> ${safe(cliente.Nome)} ${safe(cliente.Cognome)}
      </div>

      <div class="card-sub">
        <strong>ID Cliente:</strong> ${safe(cliente.ID_Cliente)}
      </div>

      <div class="card-sub">
        <strong>Totale prenotazioni:</strong> ${storico.length}
      </div>

      <div style="margin-top:12px;">
        ${
          storico.length
            ? storico.map(s => `
                <div class="lesson-client-row">
                  <strong>📅 ${s.lezioneTrovata ? safe(s.Data) : "⚠️ NO LEZIONE"} ${safe(s.Ora)}</strong><br>
                  ${safe(s.Tipologia)}<br>
                  👤 ${safe(s.Istruttore)}<br>
                  <span style="font-size:12px; color:#666;">
                    ID_Prenotazione: ${safe(s.ID_Prenotazione)}<br>
                    ID_Lezione: ${safe(s.ID_Lezione)}
                  </span>
                </div>
              `).join("")
            : `
                <div class="lesson-client-row">
                  Nessuna prenotazione trovata per questo cliente.
                </div>
              `
        }
      </div>

      <div class="card-actions">
        <button onclick="mostraSchedaCliente('${escapeQuote(cliente.ID_Cliente)}')">🔎 Scheda</button>
        <button onclick="chiudiDettaglioCliente()">Chiudi</button>
      </div>

    </div>
  `;

  box.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function chiudiDettaglioCliente() {
  renderClienti();

  const box = document.getElementById("outputClienti");

  if (isMobile()) {
    box.classList.add("view-back-enter");
    setTimeout(() => box.classList.remove("view-back-enter"), 250);
  }
}


function mostraModificaClienteInline(idCliente) {
  const box = document.getElementById("outputClienti");
  if (!box) return;

  const cliente = clientiData.find(c => String(c.ID_Cliente) === String(idCliente));

  if (!cliente) {
    box.innerHTML = `
      <div class="card-ios">
        <div class="card-title">Cliente non trovato</div>
        <div class="card-actions">
          <button onclick="chiudiDettaglioCliente()">Chiudi</button>
        </div>
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <div class="card-ios">

      <div class="card-title">
        ✏️ Modifica Cliente
      </div>

      <div class="card-sub">
        <strong>ID Cliente:</strong> ${safe(cliente.ID_Cliente)}
      </div>

      <div class="form-row">
        <input id="edit_nome" placeholder="Nome" value="${escapeAttr(cliente.Nome)}">
        <input id="edit_cognome" placeholder="Cognome" value="${escapeAttr(cliente.Cognome)}">
      </div>

      <div class="form-row">
        <input id="edit_telefono" placeholder="Telefono" value="${escapeAttr(cliente.Telefono)}">
        <input id="edit_email" placeholder="Email" value="${escapeAttr(cliente.Email)}">
      </div>

      <div class="form-row">
        <input id="edit_indirizzo" placeholder="Indirizzo" value="${escapeAttr(cliente.Indirizzo)}">
        <input id="edit_citta" placeholder="Città" value="${escapeAttr(cliente["Cittá"])}">
      </div>

      <div class="form-row">
        <input id="edit_cap" placeholder="CAP" value="${escapeAttr(cliente.CAP)}">
        <input id="edit_cf" placeholder="Codice Fiscale" value="${escapeAttr(cliente.Codice_Fiscale)}">
      </div>

      <div class="card-actions">
        <button onclick="salvaModificaClienteInline('${escapeQuote(cliente.ID_Cliente)}')">💾 Salva</button>
        <button onclick="mostraSchedaCliente('${escapeQuote(cliente.ID_Cliente)}')">Annulla</button>
      </div>

    </div>
  `;

  box.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function salvaModificaClienteInline(idCliente) {
  const payload = {
    Nome: document.getElementById("edit_nome")?.value.trim() || "",
    Cognome: document.getElementById("edit_cognome")?.value.trim() || "",
    Telefono: document.getElementById("edit_telefono")?.value.trim() || "",
    Email: document.getElementById("edit_email")?.value.trim() || "",
    Indirizzo: document.getElementById("edit_indirizzo")?.value.trim() || "",
    Cittá: document.getElementById("edit_citta")?.value.trim() || "",
    CAP: document.getElementById("edit_cap")?.value.trim() || "",
    Codice_Fiscale: document.getElementById("edit_cf")?.value.trim() || ""
  };

  if (!payload.Nome || !payload.Cognome) {
    setStatus("Nome e Cognome sono obbligatori", "err");
    return;
  }

  const { error } = await supabaseClient
    .from("clienti")
    .update(payload)
    .eq("ID_Cliente", idCliente);

  if (error) {
    console.error("Errore salvaModificaClienteInline:", error);
    setStatus(`Errore modifica cliente: ${error.message}`, "err");
    return;
  }

  await loadClienti();
  await loadPrenotazioni();

  setStatus("Cliente modificato correttamente ✅", "ok");

  setTimeout(() => {
    mostraSchedaCliente(idCliente);
  }, 100);
}

/* ===================== FOOTER MENU APP ===================== */

function vaiTab(tab) {
  const clientiSection = document.getElementById("clientiSection");
  const lezioniSection = document.getElementById("lezioniSection");
  const prenotazioniSection = document.getElementById("prenotazioniSection");

  const tabClienti = document.getElementById("tabClienti");
  const tabLezioni = document.getElementById("tabLezioni");
  const tabPrenotazioni = document.getElementById("tabPrenotazioni");

  // reset active tab
  [tabClienti, tabLezioni, tabPrenotazioni].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

  // chiude tutte le sezioni principali
  if (clientiSection) clientiSection.classList.add("hidden");
  if (lezioniSection) lezioniSection.classList.add("hidden");
  if (prenotazioniSection) prenotazioniSection.classList.add("hidden");

  // chiude eventuali dettagli aperti per evitare sovrapposizioni
  const dettaglioLezioneBox = document.getElementById("dettaglioLezioneBox");
  if (dettaglioLezioneBox) {
    dettaglioLezioneBox.innerHTML = "";
    dettaglioLezioneBox.classList.add("hidden");
  }

  const outputStoricoCliente = document.getElementById("outputStoricoCliente");
  if (outputStoricoCliente) {
    outputStoricoCliente.innerHTML = `
      <p class="muted">Clicca sul nome di un cliente nella tabella prenotazioni per vedere il suo storico.</p>
    `;
  }

  // apre la sezione scelta
  if (tab === "clienti") {
    if (clientiSection) clientiSection.classList.remove("hidden");
    if (tabClienti) tabClienti.classList.add("active");

    renderClienti();

    scrollToSection("clientiSection");
  }

  if (tab === "lezioni") {
    if (lezioniSection) lezioniSection.classList.remove("hidden");
    if (tabLezioni) tabLezioni.classList.add("active");

    renderLezioni();

    scrollToSection("lezioniSection");
  }

  if (tab === "prenotazioni") {
    if (prenotazioniSection) prenotazioniSection.classList.remove("hidden");
    if (tabPrenotazioni) tabPrenotazioni.classList.add("active");

    renderPrenotazioni();

    scrollToSection("prenotazioniSection");
  }
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  setTimeout(() => {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 80);
}

console.log("APP JS CARICATO OK");
