const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";


const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const APP_VERSION = "v-dashboard-ricavi-2026-06-22";

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
let searchClienti = "";
let reportPacchettiFiltro = "da_pagare";
let calendarioDataCorrente = getTodayString();
let dettaglioLezioneBoxAttivo = "dettaglioLezioneBox";



window.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("APP VERSION:", APP_VERSION);
    generaOrari();
    await reloadAll();

    // apertura iniziale stile app
    setTimeout(() => {
      vaiTab("calendario");
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
  document.getElementById("new_istruttore").value = "Laura";
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

function applySearchClienti() {
  const input = document.getElementById("search_clienti");
  searchClienti = input ? input.value.toLowerCase().trim() : "";
  renderClienti();
}

function resetSearchClienti() {
  searchClienti = "";
  const input = document.getElementById("search_clienti");
  if (input) input.value = "";
  renderClienti();
}


async function reloadAll() {
  await loadClienti();
  await loadLezioni();
  await loadPacchetti();
  await loadPrenotazioni();
  calcolaDashboardMensile();
  calcolaDashboardSettimanale();

  
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

/* ===================== ID UTILS ===================== */

function generaNuovoIdProgressivo(prefix, rows, fieldName) {
  const regex = new RegExp(`^${prefix}\\d{6}$`);

  const numeriValidi = (rows || [])
    .map(row => String(row[fieldName] || ""))
    .filter(id => regex.test(id))
    .map(id => Number(id.replace(prefix, "")))
    .filter(n => !Number.isNaN(n));

  const prossimoNumero = numeriValidi.length
    ? Math.max(...numeriValidi) + 1
    : 1;

  return prefix + String(prossimoNumero).padStart(6, "0");
}

function generaNuoviIdProgressivi(prefix, rows, fieldName, quantita) {
  const regex = new RegExp(`^${prefix}\\d{6}$`);

  const numeriValidi = (rows || [])
    .map(row => String(row[fieldName] || ""))
    .filter(id => regex.test(id))
    .map(id => Number(id.replace(prefix, "")))
    .filter(n => !Number.isNaN(n));

  const ultimoNumero = numeriValidi.length
    ? Math.max(...numeriValidi)
    : 0;

  return Array.from({ length: quantita }).map((_, index) => {
    return prefix + String(ultimoNumero + index + 1).padStart(6, "0");
  });
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

function formatOraHHMM(value) {
  return String(value || "").substring(0, 5);
}

function formatDataEstesaIt(dateString) {
  if (!dateString) return "";

  const d = new Date(dateString + "T00:00:00");

  const giorni = [
    "Domenica",
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato"
  ];

  const mesi = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre"
  ];

  return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()}`;
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

  const clientiFiltrati = clientiData.filter(c => {
    if (!searchClienti) return true;

    const nome = (c.Nome || "").toLowerCase();
    const cognome = (c.Cognome || "").toLowerCase();
    const telefono = (c.Telefono || "").toLowerCase();
    const email = (c.Email || "").toLowerCase();

    const full = (nome + " " + cognome).toLowerCase();

    return full.includes(searchClienti) ||
       nome.includes(searchClienti) ||
       cognome.includes(searchClienti);
  });

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
      ${
        clientiFiltrati.length
          ? clientiFiltrati.map(c => `
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
                  <button onclick="mostraSchedaCliente('${escapeQuote(c.ID_Cliente)}')">🔎 Scheda</button>
                  <button onclick="mostraPrenotazioniCliente('${escapeQuote(c.ID_Cliente)}')">📅 Prenotazioni</button>
                  <button onclick="modificaCliente('${escapeQuote(c.ID_Cliente)}')">Modifica</button>
                  <button onclick="eliminaCliente('${escapeQuote(c.ID_Cliente)}')">Elimina</button>
                </td>
              </tr>
            `).join("")
          : `
              <tr>
                <td colspan="11">Nessun cliente trovato.</td>
              </tr>
            `
      }
    </table>
  `;

  setTimeout(() => {
    renderClientiMobileSafe();
  }, 50);
}

function renderSelectClienti() {
  const sel = document.getElementById("select_cliente");
  if (!sel) return;

  const valoreCorrente = sel.value;

  sel.innerHTML =
    '<option value="">Seleziona cliente</option>' +
    clientiData.map(c =>
      `<option value="${escapeAttr(c.ID_Cliente)}">${safe(c.Nome)} ${safe(c.Cognome)}</option>`
    ).join("");

  if (valoreCorrente) {
    sel.value = valoreCorrente;
  }

  aggiornaPacchettiPrenotazione();
}

async function aggiungiCliente() {
  const payload = {
    ID_Cliente: generaNuovoIdProgressivo("CL", clientiData, "ID_Cliente"),
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
  renderCalendario();
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
            <td>${safe((l.Ora || "").substring(0,5))}</td>
            <td>${tipologiaConStato}</td>
            <td>${safe(l.Istruttore)}</td>
            <td>${safe(l.Max_Partecipanti)}</td>
            <td>${prenotati}</td>
            <td>${rimasti}</td>
            
            <td>
            <button onclick="mostraDettaglioLezione('${escapeQuote(l.ID_Lezione)}')">🔎 Dettaglio</button>
            <button onclick="mostraDettaglioLezione('${escapeQuote(l.ID_Lezione)}')">📅 Prenota</button>
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

  const valoreCorrente = sel.value;

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
          ${safe(l.Data)} ${safe((l.Ora || "").substring(0,5))} - ${safe(l.Tipologia)}
          (${prenotati}/${max})
          ${piena ? "🔴 PIENA" : ""}
        </option>
      `;
    }).join("");

  if (valoreCorrente) {
    sel.value = valoreCorrente;
  }

  aggiornaPacchettiPrenotazione();
}

/* ===================== PACCHETTI PER PRENOTAZIONI ===================== */

function normalizzaTesto(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replace(/\s+/g, " ")
    .trim();
}

function getTipologiaPacchetto(tipoPacchetto) {
  const info = TIPI_PACCHETTO[tipoPacchetto];

  if (info && info.Tipologia) {
    return info.Tipologia;
  }

  const testo = normalizzaTesto(tipoPacchetto);

  if (testo.includes("privata")) return "Privata";
  if (testo.includes("duetto")) return "Duetto";
  if (testo.includes("mini-gruppo") || testo.includes("mini gruppo") || testo.includes("mini")) return "Mini-Gruppo";

  return "";
}

function getTipologiaLezione(lezione) {
  const testo = normalizzaTesto(lezione?.Tipologia || "");

  if (testo.includes("privata")) return "Privata";
  if (testo.includes("duetto")) return "Duetto";
  if (testo.includes("mini-gruppo") || testo.includes("mini gruppo") || testo.includes("mini")) return "Mini-Gruppo";

  return lezione?.Tipologia || "";
}

function contaPrenotazioniPacchetto(idPacchetto) {
  return prenotazioniData.filter(p =>
    String(p.ID_Pacchetto || "") === String(idPacchetto || "")
  ).length;
}

function getLezioniResiduePacchetto(pacchetto) {
  const totali = Number(pacchetto.Lezioni_Totali || 0);
  const usate = contaPrenotazioniPacchetto(pacchetto.ID_Pacchetto);
  return totali - usate;
}

function pacchettoCompatibilePerLezione(pacchetto, lezione) {
  if (!pacchetto || !lezione) return false;

  const stato = normalizzaTesto(pacchetto.Stato || "");
  if (stato === "chiuso") return false;

  const tipologiaPacchetto = getTipologiaPacchetto(pacchetto.Tipo_Pacchetto);
  const tipologiaLezione = getTipologiaLezione(lezione);

  return normalizzaTesto(tipologiaPacchetto) === normalizzaTesto(tipologiaLezione);
}

function getAvvisiPacchettoPrenotazione(pacchetto, lezione) {
  const avvisi = [];

  if (!pacchetto || !lezione) return avvisi;

  const residuo = getLezioniResiduePacchetto(pacchetto);

  if (lezione.Data && pacchetto.Valido_A && String(lezione.Data) > String(pacchetto.Valido_A)) {
    avvisi.push("pacchetto scaduto");
  }

  if (residuo <= 0) {
    avvisi.push(`lezioni residue ${residuo}`);
  }

  return avvisi;
}

function getPacchettiClienteNonChiusi(idCliente) {
  return pacchettiData.filter(p => {
    const stato = normalizzaTesto(p.Stato || "");

    return (
      String(p.ID_Cliente) === String(idCliente) &&
      stato !== "chiuso"
    );
  });
}

function getLezioniResiduePerTipologia(idCliente) {
  const pacchetti = pacchettiData.filter(p => 
    String(p.ID_Cliente) === String(idCliente) &&
    normalizzaTesto(p.Stato || "") !== "chiuso"
  );

  const risultato = {};

  pacchetti.forEach(p => {
    const tipologia = getTipologiaPacchetto(p.Tipo_Pacchetto);
    const residue = getLezioniResiduePacchetto(p);

    if (!tipologia) return;

    if (!risultato[tipologia]) {
      risultato[tipologia] = 0;
    }

    risultato[tipologia] += residue;
  });

  return risultato;
}

function getPacchettiCompatibiliPerPrenotazione(idCliente, idLezione) {
  const lezione = lezioniData.find(l =>
    String(l.ID_Lezione) === String(idLezione)
  );

  if (!idCliente || !lezione) return [];

  return getPacchettiClienteNonChiusi(idCliente)
    .filter(p => pacchettoCompatibilePerLezione(p, lezione))
    .sort((a, b) => {
      const residuoA = getLezioniResiduePacchetto(a);
      const residuoB = getLezioniResiduePacchetto(b);

      // Prima quelli con più residuo
      if (residuoB !== residuoA) return residuoB - residuoA;

      // Poi quelli con scadenza più vicina
      const aDate = String(a.Valido_A || "");
      const bDate = String(b.Valido_A || "");
      return aDate.localeCompare(bDate);
    });
}

function aggiornaPacchettiPrenotazione() {
  const selectCliente = document.getElementById("select_cliente");
  const selectLezione = document.getElementById("select_lezione");
  const selectPacchetto = document.getElementById("select_pacchetto");

  if (!selectPacchetto) {
    console.warn("select_pacchetto non trovato nel DOM");
    return;
  }

  const idCliente = selectCliente ? selectCliente.value : "";
  const idLezione = selectLezione ? selectLezione.value : "";

  if (!idCliente || !idLezione) {
    selectPacchetto.innerHTML = `
      <option value="">Seleziona prima cliente e lezione</option>
    `;
    return;
  }

  const lezione = lezioniData.find(l =>
    String(l.ID_Lezione) === String(idLezione)
  );

  if (!lezione) {
    selectPacchetto.innerHTML = `
      <option value="">Lezione non trovata</option>
    `;
    setStatus("Lezione non trovata per aggiornare il pacchetto", "err");
    return;
  }

  const pacchettiCompatibili = getPacchettiCompatibiliPerPrenotazione(idCliente, idLezione);
  const pacchettiCliente = getPacchettiClienteNonChiusi(idCliente);

  if (!pacchettiCompatibili.length) {
    const tipologiaLezione = getTipologiaLezione(lezione);

    selectPacchetto.innerHTML = `
      <option value="">Nessun pacchetto ${safe(tipologiaLezione)} compatibile</option>
      ${
        pacchettiCliente.length
          ? pacchettiCliente.map(p => `
              <option value="" disabled>
                Non compatibile: ${safe(p.ID_Pacchetto)} - ${safe(p.Tipo_Pacchetto)}
              </option>
            `).join("")
          : `<option value="" disabled>Il cliente non ha pacchetti aperti</option>`
      }
    `;

    setStatus(
      `Nessun pacchetto compatibile trovato per cliente e tipologia lezione (${tipologiaLezione})`,
      "err"
    );

    return;
  }

  selectPacchetto.innerHTML =
    '<option value="">Seleziona pacchetto</option>' +
    pacchettiCompatibili.map(p => {
      const residue = getLezioniResiduePacchetto(p);
      const avvisi = getAvvisiPacchettoPrenotazione(p, lezione);
      const warning = avvisi.length ? ` ⚠️ ${avvisi.join(" / ")}` : "";

      return `
        <option value="${escapeAttr(p.ID_Pacchetto)}">
          ${safe(p.ID_Pacchetto)} - ${safe(p.Tipo_Pacchetto)} - residue: ${residue} - valido A: ${safe(p.Valido_A)}${warning}
        </option>
      `;
    }).join("");

  selectPacchetto.value = pacchettiCompatibili[0].ID_Pacchetto;

  const avvisiPrimo = getAvvisiPacchettoPrenotazione(pacchettiCompatibili[0], lezione);

  if (avvisiPrimo.length) {
    setStatus(
      `Attenzione: ${avvisiPrimo.join(" / ")}. Puoi comunque registrare la prenotazione.`,
      "err"
    );
  } else {
    setStatus("Pacchetto compatibile proposto automaticamente ✅", "ok");
  }
}

async function aggiungiLezione() {
  const Tipologia = document.getElementById("new_tipologia")?.value || "";

  const payload = {
    ID_Lezione: generaNuovoIdProgressivo("LZ", lezioniData, "ID_Lezione"),
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
    "ID_Prenotazione, ID_Cliente, ID_Lezione, ID_Pacchetto",
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
  renderCalendario();
  aggiornaPacchettiPrenotazione();
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
        <th>ID_Pacchetto</th>
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
            <td>${safe(p.ID_Pacchetto || "⚠️ NO PACCHETTO")}</td>
            <td>${lezione ? safe(lezione.Data) : "⚠️ NO LEZIONE"}</td>
            <td>${lezione ? safe((lezione.Ora || "").substring(0,5)) : ""}</td>
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
  const idPacchetto = document.getElementById("select_pacchetto")?.value || "";

  if (!idCliente || !idLezione) {
    setStatus("Seleziona cliente e lezione", "err");
    return;
  }

  if (!idPacchetto) {
    setStatus("Seleziona un pacchetto per questa prenotazione", "err");
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

  const count = prenotazioniData.filter(p =>
    String(p.ID_Lezione) === String(idLezione)
  ).length;

  if (count >= Number(lezione.Max_Partecipanti || 0)) {
    setStatus("Lezione piena", "err");
    return;
  }

  const pacchetto = pacchettiData.find(p =>
    String(p.ID_Pacchetto) === String(idPacchetto)
  );

  if (!pacchetto) {
    setStatus("Pacchetto non trovato", "err");
    return;
  }

  if (!pacchettoCompatibilePerLezione(pacchetto, lezione)) {
    setStatus("Il pacchetto selezionato non è compatibile con la tipologia della lezione", "err");
    return;
  }

  const avvisi = getAvvisiPacchettoPrenotazione(pacchetto, lezione);

  if (avvisi.length) {
    const conferma = confirm(
      `Attenzione: ${avvisi.join(" / ")}.\n\nVuoi registrare comunque la prenotazione?`
    );

    if (!conferma) {
      setStatus("Prenotazione annullata", "err");
      return;
    }
  }

  const response = await supabaseClient
    .from("prenotazioni")
    .insert([{
      ID_Prenotazione: generaNuovoIdProgressivo("PR", prenotazioniData, "ID_Prenotazione"),
      ID_Cliente: idCliente,
      ID_Lezione: idLezione,
      ID_Pacchetto: idPacchetto
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

  const selectPacchetto = document.getElementById("select_pacchetto");
  if (selectPacchetto) {
    selectPacchetto.innerHTML = `
      <option value="">Seleziona prima cliente e lezione</option>
    `;
  }

  await loadPrenotazioni();
  await loadPacchetti();

const reportBox = document.getElementById("reportPacchettiBox");
if (reportBox && !reportBox.classList.contains("hidden")) {
  renderReportPacchetti();
}

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
await loadPacchetti();

const reportBox = document.getElementById("reportPacchettiBox");
if (reportBox && !reportBox.classList.contains("hidden")) {
  
renderReportPacchetti();
}

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
      <button onclick="inviaWhatsAppCliente('${escapeQuote(idCliente)}')">📲 WhatsApp</button>
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
                <td>${safe(formatOraHHMM(s.Ora))}</td>
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

  aggiornaPacchettiPrenotazione();

  if (section) {
  section.scrollIntoView({ behavior: "smooth" });
}
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
  <button onclick="mostraDettaglioLezione('${escapeQuote(idLezione)}')">📅 Prenota</button>
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

      const residui = getLezioniResiduePerTipologia(id);


const righeResiduo = Object.entries(residui)
  .map(([tipo, val]) => `• ${tipo}: ${val}`)
  .join("<br>");


cards.push(`
  <div class="card-ios">

    <div class="card-title">
      ${nome} ${cognome}
    </div>

    <div class="card-sub">📞 ${telefono}</div>

    ${
      righeResiduo
        ? `<div class="card-sub">🎯<br>${righeResiduo}</div>`
        : ""
    }

    <div class="card-actions">
      <button onclick="mostraSchedaCliente('${escapeQuote(id)}')">🔎 Scheda</button>
      <button onclick="mostraPacchettiCliente('${escapeQuote(id)}')">🎟️ Pacchetti</button>
      <button onclick="mostraPrenotazioniCliente('${escapeQuote(id)}')">📅 Prenotazioni</button>
      <button onclick="inviaWhatsAppCliente('${escapeQuote(id)}')">📲 WhatsApp</button>
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

      if (!cells || cells.length < 10) continue;

      const cliente = cells[2].innerText;
      const idLezione = cells[3].innerText;
      const idPacchetto = cells[4].innerText;
      const data = cells[5].innerText;
      const ora = cells[6].innerText;
      const tipologia = cells[7].innerText;
      const istruttore = cells[8].innerText;
      const azioni = cells[9].innerHTML;

      cards.push(`
        <div class="card-ios">
          <div class="card-title">
            ${cliente}
          </div>

          <div class="card-sub">📅 ${data} - ${(ora || "").substring(0,5)}</div>
          <div class="card-sub">${tipologia}</div>
          <div class="card-sub">👤 ${istruttore}</div>
          <div class="card-sub">🎟️ Pacchetto: ${idPacchetto}</div>
          <div class="card-sub">ID Lezione: ${idLezione}</div>

          <div class="card-actions">
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

function mostraDettaglioLezione(idLezione, boxId = "dettaglioLezioneBox") {
  dettaglioLezioneBoxAttivo = boxId;
    const box = document.getElementById(boxId);
  if (!box) return;

  const lezione = lezioniData.find(l => String(l.ID_Lezione) === String(idLezione));
  if (!lezione) return;

  const prenotazioniLezione = prenotazioniData.filter(p =>
    String(p.ID_Lezione) === String(idLezione)
  );

  const max = Number(lezione.Max_Partecipanti || 0);
  const prenotati = prenotazioniLezione.length;
  const postiLiberi = Math.max(max - prenotati, 0);

  const clientiGiaPrenotatiHtml = prenotazioniLezione.length
    ? prenotazioniLezione.map(p => {
        const cliente = clientiData.find(c =>
          String(c.ID_Cliente) === String(p.ID_Cliente)
        );

        const pacchetto = pacchettiData.find(pc =>
          String(pc.ID_Pacchetto) === String(p.ID_Pacchetto)
        );

        return `
          <div class="lesson-client-row">
            <strong>${cliente ? safe(cliente.Nome + " " + cliente.Cognome) : "Cliente non trovato"}</strong><br>
            <span style="font-size:12px; color:#666;">
              Pacchetto: ${safe(p.ID_Pacchetto || "-")}
              ${pacchetto ? ` — ${safe(pacchetto.Tipo_Pacchetto || "")}` : ""}
            </span>
            <div class="card-actions" style="margin-top:8px;">
              <button onclick="eliminaPrenotazioneDaLezione('${escapeQuote(p.ID_Prenotazione)}', '${escapeQuote(idLezione)}')">
                🗑️ Cancella prenotazione
              </button>
            </div>
          </div>
        `;
      }).join("")
    : `
      <div class="lesson-client-row">
        Nessun cliente ancora prenotato.
      </div>
    `;

  const slotHtml = postiLiberi > 0
    ? Array.from({ length: postiLiberi }).map((_, index) => `
        <div class="lesson-client-row">
          <strong>Slot ${index + 1}</strong>

          <div class="form-row">
            <label class="field-block">
              <span class="field-label">Cliente</span>
              <select
                id="slot_cliente_${index}"
                onchange="aggiornaPacchettoSlotLezione('${escapeQuote(idLezione)}', ${index})"
              >
                <option value="">Seleziona cliente</option>
                ${clientiData.map(c => `
                  <option value="${escapeAttr(c.ID_Cliente)}">
                    ${safe(c.Nome)} ${safe(c.Cognome)}
                  </option>
                `).join("")}
              </select>
            </label>

            <label class="field-block">
              <span class="field-label">Pacchetto</span>
              <select id="slot_pacchetto_${index}">
                <option value="">Seleziona prima il cliente</option>
              </select>
            </label>
          </div>
        </div>
      `).join("")
    : `
      <div class="lesson-client-row">
        🔴 Lezione piena. Non ci sono slot disponibili.
      </div>
    `;

  animateView(box, `
    <div class="app-toolbar">
      <button class="app-back-btn" onclick="chiudiDettaglioLezione('${escapeQuote(boxId)}')">← Indietro</button>
    </div>

    <div class="lesson-detail">

      <div class="lesson-detail-title">
        ${safe(lezione.Data)} - ${safe(formatOraHHMM(lezione.Ora))}
      </div>

      <div class="lesson-detail-sub">
        ${safe(lezione.Tipologia)} (${prenotati}/${max})
      </div>

      <div class="lesson-detail-sub">
        👤 ${safe(lezione.Istruttore)}
      </div>

      <div class="lesson-detail-section">
        <div class="lesson-detail-section-title">
          Clienti già prenotati
        </div>
        ${clientiGiaPrenotatiHtml}
      </div>

      <div class="lesson-detail-section">
        <div class="lesson-detail-section-title">
          Aggiungi prenotazioni
        </div>
        ${slotHtml}
      </div>

      ${
        postiLiberi > 0
          ? `
            <div class="lesson-detail-actions">
              <button onclick="salvaPrenotazioniDaLezione('${escapeQuote(idLezione)}')">
                💾 Salva prenotazioni
              </button>
            </div>
          `
          : ""
      }

    </div>
  `);
}



function chiudiDettaglioLezione(boxId = "dettaglioLezioneBox") {
  const box = document.getElementById(boxId);
  closeAnimated(box);
}

function aggiornaPacchettoSlotLezione(idLezione, index) {
  const clienteSelect = document.getElementById(`slot_cliente_${index}`);
  const pacchettoSelect = document.getElementById(`slot_pacchetto_${index}`);

  if (!clienteSelect || !pacchettoSelect) return;

  const idCliente = clienteSelect.value;

  if (!idCliente) {
    pacchettoSelect.innerHTML = `
      <option value="">Seleziona prima il cliente</option>
    `;
    return;
  }

  const pacchettiCompatibili = getPacchettiCompatibiliPerPrenotazione(
    idCliente,
    idLezione
  );

  if (!pacchettiCompatibili.length) {
    pacchettoSelect.innerHTML = `
      <option value="">Nessun pacchetto compatibile</option>
    `;
    return;
  }

  pacchettoSelect.innerHTML =
    `<option value="">Seleziona pacchetto</option>` +
    pacchettiCompatibili.map(p => {
      const residue = getLezioniResiduePacchetto(p);
      const lezione = lezioniData.find(l =>
        String(l.ID_Lezione) === String(idLezione)
      );
      const avvisi = getAvvisiPacchettoPrenotazione(p, lezione);
      const warning = avvisi.length ? ` ⚠️ ${avvisi.join(" / ")}` : "";

      return `
        <option value="${escapeAttr(p.ID_Pacchetto)}">
          ${safe(p.ID_Pacchetto)} - ${safe(p.Tipo_Pacchetto)} - residue: ${residue}${warning}
        </option>
      `;
    }).join("");

  pacchettoSelect.value = pacchettiCompatibili[0].ID_Pacchetto;
}

async function salvaPrenotazioniDaLezione(idLezione) {
  const lezione = lezioniData.find(l =>
    String(l.ID_Lezione) === String(idLezione)
  );

  if (!lezione) {
    setStatus("Lezione non trovata", "err");
    return;
  }

  const max = Number(lezione.Max_Partecipanti || 0);

  const prenotazioniEsistenti = prenotazioniData.filter(p =>
    String(p.ID_Lezione) === String(idLezione)
  );

  const postiLiberi = Math.max(max - prenotazioniEsistenti.length, 0);

  if (postiLiberi <= 0) {
    setStatus("Lezione piena", "err");
    return;
  }

  const nuovePrenotazioni = [];

  for (let index = 0; index < postiLiberi; index++) {
    const clienteSelect = document.getElementById(`slot_cliente_${index}`);
    const pacchettoSelect = document.getElementById(`slot_pacchetto_${index}`);

    const idCliente = clienteSelect ? clienteSelect.value : "";
    const idPacchetto = pacchettoSelect ? pacchettoSelect.value : "";

    if (!idCliente) continue;

    if (!idPacchetto) {
      const cliente = clientiData.find(c =>
        String(c.ID_Cliente) === String(idCliente)
      );

      setStatus(
        `Seleziona un pacchetto per ${cliente ? cliente.Nome + " " + cliente.Cognome : "cliente selezionato"}`,
        "err"
      );
      return;
    }

    nuovePrenotazioni.push({
      ID_Cliente: idCliente,
      ID_Pacchetto: idPacchetto
    });
  }

  if (!nuovePrenotazioni.length) {
    setStatus("Seleziona almeno un cliente da prenotare", "err");
    return;
  }

  const clientiDuplicatiNellaSelezione = nuovePrenotazioni
    .map(p => p.ID_Cliente)
    .filter((id, index, arr) => arr.indexOf(id) !== index);

  if (clientiDuplicatiNellaSelezione.length) {
    setStatus("Hai selezionato due volte lo stesso cliente", "err");
    return;
  }

  for (const nuova of nuovePrenotazioni) {
    const duplicatoEsistente = prenotazioniEsistenti.find(p =>
      String(p.ID_Cliente) === String(nuova.ID_Cliente)
    );

    if (duplicatoEsistente) {
      const cliente = clientiData.find(c =>
        String(c.ID_Cliente) === String(nuova.ID_Cliente)
      );

      setStatus(
        `${cliente ? cliente.Nome + " " + cliente.Cognome : "Cliente"} è già prenotato in questa lezione`,
        "err"
      );
      return;
    }

    const pacchetto = pacchettiData.find(p =>
      String(p.ID_Pacchetto) === String(nuova.ID_Pacchetto)
    );

    if (!pacchetto) {
      setStatus("Pacchetto non trovato", "err");
      return;
    }

    if (!pacchettoCompatibilePerLezione(pacchetto, lezione)) {
      setStatus("Uno dei pacchetti selezionati non è compatibile con la lezione", "err");
      return;
    }
  }

  const nuoviIdPrenotazione = generaNuoviIdProgressivi(
  "PR",
  prenotazioniData,
  "ID_Prenotazione",
  nuovePrenotazioni.length
);

const payload = nuovePrenotazioni.map((p, index) => ({
  ID_Prenotazione: nuoviIdPrenotazione[index],
  ID_Cliente: p.ID_Cliente,
  ID_Lezione: idLezione,
  ID_Pacchetto: p.ID_Pacchetto
}));

  const response = await supabaseClient
    .from("prenotazioni")
    .insert(payload)
    .select();

  if (response.error) {
    console.error("Errore salvaPrenotazioniDaLezione:", response.error);
    setStatus(`Errore salvataggio prenotazioni: ${response.error.message}`, "err");
    return;
  }

  if (!response.data || !response.data.length) {
    setStatus("Prenotazioni non restituite da Supabase: controlla le policy RLS", "err");
    return;
  }

  await loadPrenotazioni();
  await loadPacchetti();

  const reportBox = document.getElementById("reportPacchettiBox");
  if (reportBox && !reportBox.classList.contains("hidden")) {
    renderReportPacchetti();
  }

  renderCalendario();
  mostraDettaglioLezione(idLezione, dettaglioLezioneBoxAttivo);
  setStatus("Prenotazioni salvate correttamente ✅", "ok");
}

async function eliminaPrenotazioneDaLezione(idPrenotazione, idLezione) {
  if (!confirm("Eliminare questa prenotazione?")) return;

  const { error } = await supabaseClient
    .from("prenotazioni")
    .delete()
    .eq("ID_Prenotazione", idPrenotazione);

  if (error) {
    console.error("Errore eliminaPrenotazioneDaLezione:", error);
    setStatus(`Errore eliminazione prenotazione: ${error.message}`, "err");
    return;
  }

  await loadPrenotazioni();
  await loadPacchetti();

  const reportBox = document.getElementById("reportPacchettiBox");
  if (reportBox && !reportBox.classList.contains("hidden")) {
    renderReportPacchetti();
  }

  renderCalendario();
  mostraDettaglioLezione(idLezione, dettaglioLezioneBoxAttivo);
  setStatus("Prenotazione eliminata correttamente ✅", "ok");
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
        <button onclick="eliminaCliente('${escapeQuote(cliente.ID_Cliente)}')">🗑️ Elimina</button>
        <button onclick="inviaWhatsAppCliente('${escapeQuote(cliente.ID_Cliente)}')">📲 WhatsApp</button>
        <button onclick="chiudiDettaglioCliente()">← Indietro</button>
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
      <div class="app-toolbar">
        <button class="app-back-btn" onclick="chiudiDettaglioCliente()">← Indietro</button>
      </div>

      <div class="card-ios">
        <div class="card-title">Cliente non trovato</div>
        
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
                  <strong>📅 ${s.lezioneTrovata ? safe(s.Data) : "⚠️ NO LEZIONE"} ${safe(formatOraHHMM(s.Ora))}</strong><br>
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

      <div class="app-toolbar">
        <button class="app-back-btn" onclick="chiudiDettaglioCliente()">← Indietro</button>
      </div>

    </div>
  `;

  box.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function mostraPacchettiCliente(idCliente) {
  const box = document.getElementById("outputClienti");
  if (!box) return;

  const cliente = clientiData.find(c => String(c.ID_Cliente) === String(idCliente));

  const pacchetti = pacchettiData
    .filter(p => String(p.ID_Cliente) === String(idCliente))
    .sort((a,b) => String(b.Valido_Da).localeCompare(String(a.Valido_Da)));

  const html = pacchetti.map(p => {
    const usate = contaPrenotazioniPacchetto(p.ID_Pacchetto);
    const tot = Number(p.Lezioni_Totali || 0);
    const saldo = tot - usate;

    const tipologia = getTipologiaPacchetto(p.Tipo_Pacchetto);

    return `
      <div class="card-ios">
        <div class="card-title">${tipologia}</div>
        <div class="card-sub">📅 Inizio: ${p.Valido_Da}</div>
        <div class="card-sub">📊 Totali: ${tot}</div>
        <div class="card-sub">✅ Effettuate: ${usate}</div>
        <div class="card-sub">⚖️ Saldo: ${saldo}</div>
        <div class="card-sub">💰 Prezzo: ${p.Prezzo}</div>
        <div class="card-sub">💸 Da Pagare: ${p.Da_Pagare}</div>
        <div class="card-sub">📌 Stato: ${p.Stato || "Attivo"}</div>
      </div>
    `;
  }).join("");

  box.innerHTML = `
    <div class="app-toolbar">
      <button class="app-back-btn" onclick="chiudiDettaglioCliente()">← Indietro</button>
    </div>

    <div class="card-ios">
      <div class="card-title">Pacchetti ${cliente.Nome}</div>
      ${html || "<p>Nessun pacchetto</p>"}
      
    </div>
  `;
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
  const dashboardSection = document.getElementById("dashboardSection");
  const calendarioSection = document.getElementById("calendarioSection");
  const clientiSection = document.getElementById("clientiSection");
  const lezioniSection = document.getElementById("lezioniSection");
  const prenotazioniSection = document.getElementById("prenotazioniSection");
  const pacchettiSection = document.getElementById("pacchettiSection");

  const tabDashboard = document.getElementById("tabDashboard");
  const tabCalendario = document.getElementById("tabCalendario");
  const tabClienti = document.getElementById("tabClienti");
  const tabLezioni = document.getElementById("tabLezioni");
  const tabPrenotazioni = document.getElementById("tabPrenotazioni");
  const tabPacchetti = document.getElementById("tabPacchetti");

  const dashboardWrapper = dashboardSection?.parentElement;
  const calendarioWrapper = calendarioSection?.parentElement;
  const clientiWrapper = clientiSection?.parentElement;
  const lezioniWrapper = lezioniSection?.parentElement;
  const prenotazioniWrapper = prenotazioniSection?.parentElement;
  const pacchettiWrapper = pacchettiSection?.parentElement;

  const wrappers = [
    dashboardWrapper,
    calendarioWrapper,
    clientiWrapper,
    lezioniWrapper,
    prenotazioniWrapper,
    pacchettiWrapper
  ];

  wrappers.forEach(wrapper => {
    if (wrapper) wrapper.classList.remove("active-section");
  });

  [
    tabDashboard,
    tabCalendario,
    tabClienti,
    tabLezioni,
    tabPrenotazioni,
    tabPacchetti
  ].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

  if (dashboardSection) dashboardSection.classList.add("hidden");
  if (calendarioSection) calendarioSection.classList.add("hidden");
  if (clientiSection) clientiSection.classList.add("hidden");
  if (lezioniSection) lezioniSection.classList.add("hidden");
  if (prenotazioniSection) prenotazioniSection.classList.add("hidden");
  if (pacchettiSection) pacchettiSection.classList.add("hidden");

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

  if (tab === "dashboard") {
    if (dashboardWrapper) dashboardWrapper.classList.add("active-section");
    if (dashboardSection) dashboardSection.classList.remove("hidden");
    if (tabDashboard) tabDashboard.classList.add("active");

    calcolaDashboardMensile();
    calcolaDashboardSettimanale();

    scrollToSection("dashboardSection");
  }

  if (tab === "calendario") {
    if (calendarioWrapper) calendarioWrapper.classList.add("active-section");
    if (calendarioSection) calendarioSection.classList.remove("hidden");
    if (tabCalendario) tabCalendario.classList.add("active");

    renderCalendario();

    scrollToSection("calendarioSection");
  }

  if (tab === "clienti") {
    if (clientiWrapper) clientiWrapper.classList.add("active-section");
    if (clientiSection) clientiSection.classList.remove("hidden");
    if (tabClienti) tabClienti.classList.add("active");

    renderClienti();

    scrollToSection("clientiSection");
  }

  if (tab === "lezioni") {
    if (lezioniWrapper) lezioniWrapper.classList.add("active-section");
    if (lezioniSection) lezioniSection.classList.remove("hidden");
    if (tabLezioni) tabLezioni.classList.add("active");

    renderLezioni();

    scrollToSection("lezioniSection");
  }

  if (tab === "prenotazioni") {
    if (prenotazioniWrapper) prenotazioniWrapper.classList.add("active-section");
    if (prenotazioniSection) prenotazioniSection.classList.remove("hidden");
    if (tabPrenotazioni) tabPrenotazioni.classList.add("active");

    loadPrenotazioni();

    scrollToSection("prenotazioniSection");
  }

  if (tab === "pacchetti") {
    if (pacchettiWrapper) pacchettiWrapper.classList.add("active-section");
    if (pacchettiSection) pacchettiSection.classList.remove("hidden");
    if (tabPacchetti) tabPacchetti.classList.add("active");

    loadPacchetti();

    scrollToSection("pacchettiSection");
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

/* ===================== PACCHETTI ===================== */

let pacchettiData = [];

let daPagareManuale = false;
let lezioniAddManuale = false;

function segnaLezioniAddManuale() {
  lezioniAddManuale = true;
}

function segnaDaPagareManuale() {
  daPagareManuale = true;
}

const TIPI_PACCHETTO = {
  "Privata - 1": {
    Tipologia: "Privata",
    Lezioni_Base: 1,
    Scadenza_Mesi: 3
  },
  "Privata - 10": {
    Tipologia: "Privata",
    Lezioni_Base: 10,
    Scadenza_Mesi: 3
  },
  "Privata - 20": {
    Tipologia: "Privata",
    Lezioni_Base: 20,
    Scadenza_Mesi: 6
  },
  "Privata BW - 20": {
    Tipologia: "Privata",
    Lezioni_Base: 20,
    Scadenza_Mesi: 3
  },
  "Duetto - 1": {
    Tipologia: "Duetto",
    Lezioni_Base: 1,
    Scadenza_Mesi: 1
  },
  "Duetto - 10": {
    Tipologia: "Duetto",
    Lezioni_Base: 10,
    Scadenza_Mesi: 3
  },
  "Duetto - 20": {
    Tipologia: "Duetto",
    Lezioni_Base: 20,
    Scadenza_Mesi: 6
  },
  "Duetto BW - 20": {
    Tipologia: "Duetto",
    Lezioni_Base: 20,
    Scadenza_Mesi: 3
  },
  "Mini-Gruppo - 1": {
    Tipologia: "Mini-Gruppo",
    Lezioni_Base: 1,
    Scadenza_Mesi: 1
  },
  "Mini-Gruppo - 10": {
    Tipologia: "Mini-Gruppo",
    Lezioni_Base: 10,
    Scadenza_Mesi: 3
  },
  "Mini-Gruppo - 20": {
    Tipologia: "Mini-Gruppo",
    Lezioni_Base: 20,
    Scadenza_Mesi: 6
  },
  "Mini-Gruppo BW - 20": {
    Tipologia: "Mini-Gruppo",
    Lezioni_Base: 20,
    Scadenza_Mesi: 3
  },
  "Mini-Gruppo - 40": {
    Tipologia: "Mini-Gruppo",
    Lezioni_Base: 40,
    Scadenza_Mesi: 12
  },
  "Mini-Gruppo BW - 40": {
    Tipologia: "Mini-Gruppo",
    Lezioni_Base: 40,
    Scadenza_Mesi: 6
  }
};

async function loadPacchetti() {
  const { data, error } = await fetchAllRows(
    "pacchetti",
    "*",
    "ID_Pacchetto",
    false
  );

  if (error) {
    console.error("Errore loadPacchetti:", error);
    setStatus(`Errore caricamento pacchetti: ${error.message}`, "err");
    return;
  }

  pacchettiData = data || [];

  renderSelectPacchettoClienti();
  renderSelectTipiPacchetto();
  renderPacchetti();
  aggiornaPacchettiPrenotazione();

  const reportBox = document.getElementById("reportPacchettiBox");
  if (reportBox && !reportBox.classList.contains("hidden")) {
    renderReportPacchetti();
  }
}

function renderSelectPacchettoClienti() {
  const sel = document.getElementById("pac_cliente");
  if (!sel) return;

  sel.innerHTML =
    '<option value="">Seleziona cliente</option>' +
    clientiData.map(c =>
      `<option value="${escapeAttr(c.ID_Cliente)}">${safe(c.Nome)} ${safe(c.Cognome)}</option>`
    ).join("");
}

function renderSelectTipiPacchetto() {
  const sel = document.getElementById("pac_tipo");
  if (!sel) return;

  sel.innerHTML =
    '<option value="">Tipo pacchetto</option>' +
    Object.keys(TIPI_PACCHETTO).map(tipo =>
      `<option value="${escapeAttr(tipo)}">${safe(tipo)}</option>`
    ).join("");
}

function toggleNuovoPacchetto() {
  const box = document.getElementById("nuovoPacchettoBox");
  if (!box) return;

  renderSelectPacchettoClienti();
  renderSelectTipiPacchetto();

  box.classList.toggle("hidden");

  if (!box.classList.contains("hidden")) {
    preparaNuovoPacchetto();
    box.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function preparaNuovoPacchetto() {
  const validoDa = document.getElementById("pac_valido_da");
  if (validoDa && !validoDa.value) {
    validoDa.value = getTodayString();
  }

  const lezioniAdd = document.getElementById("pac_lezioni_add");
  if (lezioniAdd && lezioniAdd.value === "") {
    lezioniAdd.value = "0";
  }

  aggiornaAnteprimaPacchetto();
}

function aggiungiMesiAData(dateString, mesi) {
  if (!dateString) return "";

  const d = new Date(`${dateString}T00:00:00`);
  d.setMonth(d.getMonth() + Number(mesi || 0));

  return formatDateLocal(d);
}

function getSaldoNegativoPrecedente(idCliente, tipologia) {
  const pacchettiCompatibili = pacchettiData.filter(p => {
    const stato = String(p.Stato || "").toLowerCase();
    const tipoPacchetto = getTipologiaPacchetto(p.Tipo_Pacchetto);

    return (
      String(p.ID_Cliente) === String(idCliente) &&
      String(tipoPacchetto) === String(tipologia) &&
      stato !== "chiuso"
    );
  });

  let saldoNegativo = 0;

  pacchettiCompatibili.forEach(p => {
    const residuo = getLezioniResiduePacchetto(p);

    if (residuo < 0) {
      saldoNegativo += residuo;
    }
  });

  return saldoNegativo;
}


function aggiornaAnteprimaPacchetto() {

  const clienteValue = document.getElementById("pac_cliente")?.value || "";
  const tipoValue = document.getElementById("pac_tipo")?.value || "";
  const tipo = TIPI_PACCHETTO[tipoValue];

  const lezioniBaseInput = document.getElementById("pac_lezioni_base");
  const lezioniAddInput = document.getElementById("pac_lezioni_add");
  const lezioniTotaliInput = document.getElementById("pac_lezioni_totali");

  const prezzoInput = document.getElementById("pac_prezzo");
  const flagPagatoInput = document.getElementById("pac_flag_pagato");
  const daPagareInput = document.getElementById("pac_da_pagare");

  const flagCInput = document.getElementById("pac_flag_c");
  const fatturaNrInput = document.getElementById("pac_fattura_nr");

  const validoDaInput = document.getElementById("pac_valido_da");
  const validoAInput = document.getElementById("pac_valido_a");
  const dataFatturaInput = document.getElementById("pac_data_fattura");

  const saldoWarning = document.getElementById("pac_saldo_warning");

  // ✅ Default Data Fattura = Valido Da
  if (
    validoDaInput &&
    dataFatturaInput &&
    validoDaInput.value &&
    !dataFatturaInput.value
  ) {
    dataFatturaInput.value = validoDaInput.value;
  }

  const lezioniBase = tipo ? Number(tipo.Lezioni_Base || 0) : 0;

  let saldoNegativoDaTrasferire = 0;

  if (clienteValue && tipo) {
    saldoNegativoDaTrasferire = getSaldoNegativoPrecedente(
      clienteValue,
      tipo.Tipologia
    );
  }

  if (lezioniAddInput && !lezioniAddManuale) {
    lezioniAddInput.value =
      saldoNegativoDaTrasferire < 0
        ? String(saldoNegativoDaTrasferire)
        : "0";
  }

  const lezioniAdd = Number(lezioniAddInput?.value || 0);
  const lezioniTotali = lezioniBase + lezioniAdd;

  if (lezioniBaseInput) {
    lezioniBaseInput.value = tipo ? lezioniBase : "";
  }

  if (lezioniTotaliInput) {
    lezioniTotaliInput.value = tipo ? lezioniTotali : "";
  }

  if (saldoWarning) {
    if (saldoNegativoDaTrasferire < 0 && !lezioniAddManuale) {
      saldoWarning.textContent =
        `Saldo negativo precedente rilevato: ${saldoNegativoDaTrasferire}`;
      saldoWarning.style.color = "#b00020";
    } else {
      saldoWarning.textContent = "";
      saldoWarning.style.color = "";
    }
  }

  const prezzo = Number(prezzoInput?.value || 0);
  const flagPagato = flagPagatoInput?.value || "Si";

  if (daPagareInput) {
    if (flagPagato === "Si") {
      daPagareInput.value = "0";
      daPagareInput.readOnly = true;
      daPagareInput.required = false;
      daPagareManuale = false;
    } else {
      daPagareInput.readOnly = false;
      daPagareInput.required = true;

      if (!daPagareManuale) {
        daPagareInput.value = String(prezzo);
      }
    }
  }

  if (validoAInput) {
    validoAInput.value =
      tipo && validoDaInput?.value
        ? aggiungiMesiAData(validoDaInput.value, tipo.Scadenza_Mesi)
        : "";
  }

  const flagC = flagCInput?.value || "Si";

  if (fatturaNrInput) {
    if (flagC === "No") {
      fatturaNrInput.disabled = false;
      fatturaNrInput.placeholder = "Fattura Nr (opzionale)";
    } else {
      fatturaNrInput.disabled = true;
      fatturaNrInput.value = "";
      fatturaNrInput.placeholder = "Fattura Nr non richiesta";
    }
  }

}


function generaNuovoIdPacchetto() {
  return generaNuovoIdProgressivo("PC", pacchettiData, "ID_Pacchetto");
}

async function aggiungiPacchetto() {
  aggiornaAnteprimaPacchetto();

  const ID_Cliente = document.getElementById("pac_cliente")?.value || "";
  const Tipo_Pacchetto = document.getElementById("pac_tipo")?.value || "";
  const tipo = TIPI_PACCHETTO[Tipo_Pacchetto];

  const Lezioni_Base = Number(document.getElementById("pac_lezioni_base")?.value || 0);
  const Lezioni_Add = Number(document.getElementById("pac_lezioni_add")?.value || 0);
  const Lezioni_Totali = Number(document.getElementById("pac_lezioni_totali")?.value || 0);
  const Prezzo = Number(document.getElementById("pac_prezzo")?.value || 0);
  const Flag_Pagato = document.getElementById("pac_flag_pagato")?.value || "Si";
  const Flag_C = document.getElementById("pac_flag_c")?.value || "Si";

  const daPagareRaw = document.getElementById("pac_da_pagare")?.value;
  const Da_Pagare = Flag_Pagato === "Si" ? 0 : Number(daPagareRaw || 0);

  const Fattura_Nr = document.getElementById("pac_fattura_nr")?.value.trim() || "";
  const Data_Fattura = document.getElementById("pac_data_fattura")?.value || "";
  const Valido_Da = document.getElementById("pac_valido_da")?.value || "";
  const Valido_A = document.getElementById("pac_valido_a")?.value || "";
  const Stato = document.getElementById("pac_stato")?.value || "";

  if (!ID_Cliente) {
    setStatus("Seleziona un cliente per il pacchetto", "err");
    return;
  }

  if (!Tipo_Pacchetto || !tipo) {
    setStatus("Seleziona un tipo pacchetto valido", "err");
    return;
  }

  if (!Valido_Da || !Valido_A) {
    setStatus("Inserisci una data di inizio validità", "err");
    return;
  }

  if (Flag_Pagato === "No") {
    if (daPagareRaw === "" || daPagareRaw === null || daPagareRaw === undefined) {
      setStatus("Da Pagare è obbligatorio quando Pagato = No", "err");
      return;
    }

    if (Da_Pagare < 0) {
      setStatus("Da Pagare non può essere negativo", "err");
      return;
    }
  }



  const payload = {
    ID_Pacchetto: generaNuovoIdPacchetto(),
    ID_Cliente,
    Tipo_Pacchetto,
    Lezioni_Base,
    Lezioni_Add,
    Lezioni_Totali,
    Prezzo,
    Flag_Pagato,
    Flag_C,
    Da_Pagare,
    Fattura_Nr: Flag_C === "No" ? Fattura_Nr : "",
    Data_Fattura: Data_Fattura || null,
    Valido_Da,
    Valido_A,
    Stato
  };

  const { error } = await supabaseClient
    .from("pacchetti")
    .insert([payload]);

  if (error) {
    console.error("Errore aggiungiPacchetto:", error);
    setStatus(`Errore salvataggio pacchetto: ${error.message}`, "err");
    return;
  }

  pulisciFormPacchetto();

  const box = document.getElementById("nuovoPacchettoBox");
  if (box) box.classList.add("hidden");

  await loadPacchetti();

  setStatus("Pacchetto salvato correttamente ✅", "ok");
}

function pulisciFormPacchetto() {
  daPagareManuale = false;
  lezioniAddManuale = false;

  [
    "pac_cliente",
    "pac_tipo",
    "pac_lezioni_base",
    "pac_lezioni_totali",
    "pac_prezzo",
    "pac_da_pagare",
    "pac_fattura_nr",
    "pac_data_fattura",
    "pac_valido_da",
    "pac_valido_a",
    "pac_stato"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = "";
  });

  const lezioniAdd = document.getElementById("pac_lezioni_add");
  if (lezioniAdd) lezioniAdd.value = "0";

  const flagPagato = document.getElementById("pac_flag_pagato");
  if (flagPagato) flagPagato.value = "Si";

  const flagC = document.getElementById("pac_flag_c");
  if (flagC) flagC.value = "Si";

  const daPagare = document.getElementById("pac_da_pagare");
  if (daPagare) {
    daPagare.value = "0";
    daPagare.readOnly = true;
    daPagare.required = false;
  }
}

function renderPacchetti() {
  const out = document.getElementById("outputPacchetti");
  if (!out) return;

  if (!pacchettiData.length) {
    out.innerHTML = `<p class="muted">Nessun pacchetto trovato.</p>`;
    return;
  }

  out.innerHTML = `
    <table>
      <tr>
        <th>ID_Pacchetto</th>
        <th>Cliente</th>
        <th>ID_Cliente</th>
        <th>Tipo_Pacchetto</th>
        <th>Lezioni_Base</th>
        <th>Lezioni_Add</th>
        <th>Lezioni_Totali</th>
        <th>Prezzo</th>
        <th>Flag_Pagato</th>
        <th>Flag_C</th>
        <th>Da_Pagare</th>
        <th>Fattura_Nr</th>
        <th>Data_Fattura</th>
        <th>Valido_Da</th>
        <th>Valido_A</th>
        <th>Stato</th>
      </tr>
      ${pacchettiData.map(p => {
        const cliente = clientiData.find(c => String(c.ID_Cliente) === String(p.ID_Cliente));

        return `
          <tr>
            <td>${safe(p.ID_Pacchetto)}</td>
            <td>${cliente ? safe(cliente.Nome + " " + cliente.Cognome) : "-"}</td>
            <td>${safe(p.ID_Cliente)}</td>
            <td>${safe(p.Tipo_Pacchetto)}</td>
            <td>${safe(p.Lezioni_Base)}</td>
            <td>${safe(p.Lezioni_Add)}</td>
            <td>${safe(p.Lezioni_Totali)}</td>
            <td>${safe(p.Prezzo)}</td>
            <td>${safe(p.Flag_Pagato)}</td>
            <td>${safe(p.Flag_C)}</td>
            <td>${safe(p.Da_Pagare)}</td>
            <td>${safe(p.Fattura_Nr)}</td>
            <td>${safe(p.Data_Fattura)}</td>
            <td>${safe(p.Valido_Da)}</td>
            <td>${safe(p.Valido_A)}</td>
            <td>${safe(p.Stato)}</td>
          </tr>
        `;
      }).join("")}
    </table>
  `;

  setTimeout(() => {
    renderPacchettiMobileSafe();
  }, 50);
}

function renderPacchettiMobileSafe() {
  try {
    if (window.innerWidth > 768) return;

    const out = document.getElementById("outputPacchetti");
    if (!out) return;

    const cards = pacchettiData.map(p => {
      
      const cliente = clientiData.find(c =>
        String(c.ID_Cliente) === String(p.ID_Cliente)
      );

      const clienteNome = cliente
        ? `${cliente.Nome} ${cliente.Cognome}`
        : "Cliente non trovato";

      const lezioniTotali = Number(p.Lezioni_Totali || 0);
      const lezioniUsate = contaPrenotazioniPacchetto(p.ID_Pacchetto);
      const lezioniRimanenti = lezioniTotali - lezioniUsate;

      const prezzo = Number(p.Prezzo || 0);
      const daPagare = Number(p.Da_Pagare || 0);

      const alertDaPagare = daPagare > 0;
      const alertInScadenza = lezioniRimanenti <= 2;

      return `
        <div class="card-ios">
          
          <div class="card-title">
            ${clienteNome}
          </div>

          <div class="card-sub">
            🎟️ ${p.Tipo_Pacchetto}
          </div>

          <div class="card-sub">
            💰 Prezzo: ${prezzo}
          </div>

          <div class="card-sub">
            💸 Da pagare: ${daPagare}
          </div>

          <div class="card-sub">
            📊 Lezioni totali: ${lezioniTotali}
          </div>

          <div class="card-sub">
            ⚖️ Lezioni rimanenti: ${lezioniRimanenti}
          </div>

          <div class="card-sub">
            📅 Validità: ${p.Valido_Da} → ${p.Valido_A}
          </div>

          ${
            alertDaPagare
              ? `<div class="report-warning">⚠️ Da pagare</div>`
              : ""
          }

          ${
            alertInScadenza
              ? `<div class="report-warning">⚠️ In scadenza</div>`
              : ""
          }

          <div class="card-actions">
            <button onclick="mostraDettaglioPacchetto('${escapeQuote(p.ID_Pacchetto)}')">
              🔎 Dettaglio
            </button>

            <button onclick="modificaPacchettoInline('${escapeQuote(p.ID_Pacchetto)}')">
              ✏️ Modifica
            </button>

            <button onclick="eliminaPacchetto('${escapeQuote(p.ID_Pacchetto)}')">
              🗑️ Elimina
            </button>
          </div>

        </div>
      `;
    });

    out.innerHTML = cards.join("");

  } catch (err) {
    console.error("Errore renderPacchettiMobileSafe:", err);
  }
}


async function eliminaPacchetto(idPacchetto) {
  if (!confirm("Eliminare questo pacchetto?")) return;

  const { error } = await supabaseClient
    .from("pacchetti")
    .delete()
    .eq("ID_Pacchetto", idPacchetto);

  if (error) {
    console.error("Errore eliminaPacchetto:", error);
    setStatus(`Errore eliminazione pacchetto: ${error.message}`, "err");
    return;
  }

  await loadPacchetti();
  setStatus("Pacchetto eliminato ✅", "ok");
}


function mostraDettaglioPacchetto(idPacchetto) {
  const out = document.getElementById("outputPacchetti");

  const p = pacchettiData.find(x =>
    String(x.ID_Pacchetto) === String(idPacchetto)
  );

  if (!p) return;

  const cliente = clientiData.find(c =>
    String(c.ID_Cliente) === String(p.ID_Cliente)
  );

  const nomeCliente = cliente
    ? `${cliente.Nome} ${cliente.Cognome}`
    : "Cliente non trovato";

  const usate = contaPrenotazioniPacchetto(p.ID_Pacchetto);
  const tot = Number(p.Lezioni_Totali || 0);
  const saldo = tot - usate;

  animateView(out, `
    <div class="app-toolbar">
      <button class="app-back-btn" onclick="loadPacchetti()">← Indietro</button>
    </div>

    <div class="card-ios">
      <div class="card-title">${nomeCliente}</div>

      <div class="card-sub">🎟️ ${p.Tipo_Pacchetto}</div>
      <div class="card-sub">💰 Prezzo: ${p.Prezzo}</div>
      <div class="card-sub">💸 Da pagare: ${p.Da_Pagare}</div>

      <div class="card-sub">📊 Totali: ${tot}</div>
      <div class="card-sub">✅ Usate: ${usate}</div>
      <div class="card-sub">⚖️ Rimanenti: ${saldo}</div>

      <div class="card-sub">📅 Validità: ${p.Valido_Da} → ${p.Valido_A}</div>
      <div class="card-sub">📌 Stato: ${p.Stato}</div>

      <div class="card-actions">
        <button onclick="modificaPacchettoInline('${escapeQuote(p.ID_Pacchetto)}')">
          ✏️ Modifica
        </button>

        <button onclick="eliminaPacchetto('${escapeQuote(p.ID_Pacchetto)}')">
          🗑️ Elimina
        </button>

        <button onclick="loadPacchetti()">← Indietro</button>
      </div>
    </div>
  `);
}


function modificaPacchettoInline(idPacchetto) {
  const p = pacchettiData.find(x =>
    String(x.ID_Pacchetto) === String(idPacchetto)
  );

  if (!p) return;

  const nuovoPrezzo = prompt("Prezzo", p.Prezzo || "");
  if (nuovoPrezzo === null) return;

  const nuovoDaPagare = prompt("Da Pagare", p.Da_Pagare || "");
  if (nuovoDaPagare === null) return;

  aggiornaPacchetto(idPacchetto, {
    Prezzo: Number(nuovoPrezzo || 0),
    Da_Pagare: Number(nuovoDaPagare || 0)
  });
}

async function aggiornaPacchetto(idPacchetto, payload) {
  const { error } = await supabaseClient
    .from("pacchetti")
    .update(payload)
    .eq("ID_Pacchetto", idPacchetto);

  if (error) {
    console.error("Errore modifica pacchetto:", error);
    setStatus(`Errore modifica: ${error.message}`, "err");
    return;
  }

  await loadPacchetti();
  setStatus("Pacchetto aggiornato ✅", "ok");
}



/* ===================== REPORT PACCHETTI V2 ===================== */

function getClienteById(idCliente) {
  return clientiData.find(c => String(c.ID_Cliente) === String(idCliente));
}

function isPacchettoChiuso(pacchetto) {
  return normalizzaTesto(pacchetto?.Stato || "") === "chiuso";
}

function getReportPacchettoBase(p) {
  const cliente = getClienteById(p.ID_Cliente);

  const lezioniTotali = Number(p.Lezioni_Totali || 0);
  const lezioniEffettuate = contaPrenotazioniPacchetto(p.ID_Pacchetto);
  const saldo = lezioniTotali - lezioniEffettuate;

  const prezzo = Number(p.Prezzo || 0);
  const daPagare = Number(p.Da_Pagare || 0);
  const percentualeDaPagare = prezzo > 0 ? daPagare / prezzo : 0;

  return {
    pacchetto: p,
    cliente,
    clienteNome: cliente
      ? `${cliente.Nome || ""} ${cliente.Cognome || ""}`.trim()
      : "Cliente non trovato",
    tipologia: getTipologiaPacchetto(p.Tipo_Pacchetto),
    lezioniTotali,
    lezioniEffettuate,
    saldo,
    prezzo,
    daPagare,
    percentualeDaPagare
  };
}

function getPacchettiReportDaPagare() {
  return pacchettiData
    .filter(p => !isPacchettoChiuso(p))
    .map(getReportPacchettoBase)
    .filter(item => item.daPagare > 0)
    .sort((a, b) => {
      if (b.daPagare !== a.daPagare) {
        return b.daPagare - a.daPagare;
      }

      return b.percentualeDaPagare - a.percentualeDaPagare;
    });
}

function getPacchettiReportInScadenza() {
  return pacchettiData
    .filter(p => !isPacchettoChiuso(p))
    .map(getReportPacchettoBase)
    .filter(item => item.saldo <= 2)
    .sort((a, b) => {
      return a.saldo - b.saldo;
    });
}

function getPacchettiReportFattureMancanti() {
  return pacchettiData
    .filter(p => !isPacchettoChiuso(p))
    .map(getReportPacchettoBase)
    .filter(item => {
      const p = item.pacchetto;

      return (
        String(p.Flag_C || "") === "No" &&
        (!p.Fattura_Nr || !p.Data_Fattura)
      );
    })
    .sort((a, b) => {
      return String(b.pacchetto.Valido_Da || "").localeCompare(
        String(a.pacchetto.Valido_Da || "")
      );
    });
}

function setReportPacchettiFiltro(filtro) {
  reportPacchettiFiltro = filtro;
  renderReportPacchetti();
}

function getReportPacchettiCorrente() {
  if (reportPacchettiFiltro === "in_scadenza") {
    return getPacchettiReportInScadenza();
  }

  return getPacchettiReportDaPagare();
}

function toggleReportPacchetti() {
  const box = document.getElementById("reportPacchettiBox");
  if (!box) return;

  box.classList.toggle("hidden");

  if (!box.classList.contains("hidden")) {
    renderReportPacchetti();

    box.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function renderReportPacchettiCard(item, tipoReport) {
  const p = item.pacchetto;

  const alertDaPagare = item.daPagare > 0;
  const alertInScadenza = item.saldo <= 2;

  return `
    <div class="report-card ${tipoReport === "da_pagare" ? "report-blue" : "report-yellow"}">

      <div class="report-title">
        <button onclick="mostraPacchettiCliente('${escapeQuote(p.ID_Cliente)}')">
          ${safe(item.clienteNome)}
        </button>
      </div>

      <div class="report-line">
        🎟️ Tipo Pacchetto: ${safe(p.Tipo_Pacchetto)} — ${safe(item.tipologia)}
      </div>

      <div class="report-line">
        👤 Cliente: ${safe(item.clienteNome)}
      </div>

      <div class="report-line">
        💰 Prezzo: ${safe(p.Prezzo)} | Da pagare: ${safe(p.Da_Pagare)}
      </div>

      <div class="report-line">
        📊 Lezioni totali: ${item.lezioniTotali} | Lezioni rimanenti: ${item.saldo}
      </div>

      <div class="report-line">
        📅 Validità: ${safe(p.Valido_Da)} → ${safe(p.Valido_A)}
      </div>

      <div class="report-line">
        📌 Stato: ${safe(p.Stato || "Attivo")}
      </div>

      <div class="report-warning">
        ${alertDaPagare ? `⚠️ Da pagare: ${safe(p.Da_Pagare)}<br>` : ""}
        ${alertInScadenza ? `⚠️ In scadenza: ${item.saldo} lezioni rimanenti` : ""}
      </div>

      <div class="card-actions">
        ${
          item.cliente
            ? `<button onclick="inviaWhatsAppCliente('${escapeQuote(item.cliente.ID_Cliente)}')">📲 WhatsApp</button>`
            : ""
        }

        <button onclick="mostraPacchettiCliente('${escapeQuote(p.ID_Cliente)}')">
          🎟️ Dettaglio Pacchetti
        </button>
      </div>

    </div>
  `;
}

function renderReportFattureMancanti(items) {
  if (!items.length) return "";

  return `
    <h3>🧾 Fatture C mancanti</h3>

    <div class="report-empty">
      Pacchetti con Flag C = No senza numero fattura o senza data fattura.
    </div>

    ${items.map(item => {
      const p = item.pacchetto;

      return `
        <div class="report-card report-red">

          <div class="report-title">
            ${safe(item.clienteNome)}
          </div>

          <div class="report-line">
            🎟️ ${safe(p.ID_Pacchetto)} — ${safe(p.Tipo_Pacchetto)}
          </div>

          <div class="report-line">
            Fattura Nr: ${safe(p.Fattura_Nr || "Mancante")}
          </div>

          <div class="report-line">
            Data Fattura: ${safe(p.Data_Fattura || "Mancante")}
          </div>

          <div class="card-actions">
            ${
              item.cliente
                ? `<button onclick="inviaWhatsAppCliente('${escapeQuote(item.cliente.ID_Cliente)}')">📲 WhatsApp</button>`
                : ""
            }

            <button onclick="mostraPacchettiCliente('${escapeQuote(p.ID_Cliente)}')">
              🎟️ Dettaglio Pacchetti
            </button>
          </div>

        </div>
      `;
    }).join("")}
  `;
}

function renderReportPacchetti() {
  const out = document.getElementById("outputReportPacchetti");
  if (!out) return;

  const daPagareItems = getPacchettiReportDaPagare();
  const inScadenzaItems = getPacchettiReportInScadenza();
  const fattureMancantiItems = getPacchettiReportFattureMancanti();

  const corrente = getReportPacchettiCorrente();

  const titoloCorrente =
    reportPacchettiFiltro === "in_scadenza"
      ? "In Scadenza"
      : "Da Pagare";

  out.innerHTML = `
    <div class="report-summary">

      <button
        class="report-filter-btn ${reportPacchettiFiltro === "da_pagare" ? "active" : ""}"
        onclick="setReportPacchettiFiltro('da_pagare')"
      >
        💰 Da Pagare: ${daPagareItems.length}
      </button>

      <button
        class="report-filter-btn ${reportPacchettiFiltro === "in_scadenza" ? "active" : ""}"
        onclick="setReportPacchettiFiltro('in_scadenza')"
      >
        ⚠️ In Scadenza: ${inScadenzaItems.length}
      </button>

    </div>

    <h3>${titoloCorrente}</h3>

    ${
      corrente.length
        ? corrente
            .map(item => renderReportPacchettiCard(item, reportPacchettiFiltro))
            .join("")
        : `<div class="report-empty">Nessun pacchetto nella categoria ${safe(titoloCorrente)}.</div>`
    }

    ${renderReportFattureMancanti(fattureMancantiItems)}
  `;
}

/* ===================== CALENDARIO ===================== */

function renderAgendaOrari() {
  const sel = document.getElementById("agenda_ora");
  if (!sel) return;

  const valoreCorrente = sel.value;

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

  if (valoreCorrente) {
    sel.value = valoreCorrente;
  }
}

function preparaNuovaLezioneAgenda() {
  const data = document.getElementById("agenda_data");
  const ora = document.getElementById("agenda_ora");
  const tipologia = document.getElementById("agenda_tipologia");
  const istruttore = document.getElementById("agenda_istruttore");

  if (data) {
    data.value = calendarioDataCorrente;
  }

  renderAgendaOrari();

  if (ora && !ora.value) {
    ora.value = "";
  }

  if (tipologia && !tipologia.value) {
    tipologia.value = "";
  }

  if (istruttore && !istruttore.value) {
    istruttore.value = "Laura";
  }
}

function toggleNuovaLezioneAgenda() {
  const box = document.getElementById("nuovaLezioneAgendaBox");
  if (!box) return;

  box.classList.toggle("hidden");

  if (!box.classList.contains("hidden")) {
    preparaNuovaLezioneAgenda();

    box.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function chiudiNuovaLezioneAgenda() {
  const box = document.getElementById("nuovaLezioneAgendaBox");
  if (!box) return;

  box.classList.add("hidden");
}

function pulisciFormLezioneAgenda() {
  const data = document.getElementById("agenda_data");
  const ora = document.getElementById("agenda_ora");
  const tipologia = document.getElementById("agenda_tipologia");
  const istruttore = document.getElementById("agenda_istruttore");

  if (data) data.value = calendarioDataCorrente;
  if (ora) ora.value = "";
  if (tipologia) tipologia.value = "";
  if (istruttore) istruttore.value = "Laura";
}

async function salvaLezioneDaAgenda() {
  const Data = calendarioDataCorrente;
  const Ora = document.getElementById("agenda_ora")?.value || "";
  const Tipologia = document.getElementById("agenda_tipologia")?.value || "";
  const Istruttore = document.getElementById("agenda_istruttore")?.value.trim() || "";

  const payload = {
    ID_Lezione: generaNuovoIdProgressivo("LZ", lezioniData, "ID_Lezione"),
    Data,
    Ora,
    Tipologia,
    Istruttore,
    Max_Partecipanti: MAX_PARTECIPANTI[Tipologia]
  };

  if (!payload.Data || !payload.Ora || !payload.Tipologia || !payload.Istruttore) {
    setStatus("Compila tutti i campi della lezione", "err");
    return;
  }

  const duplicato = lezioniData.find(l =>
    String(l.Data) === String(payload.Data) &&
    String(formatOraHHMM(l.Ora)) === String(formatOraHHMM(payload.Ora)) &&
    normalizzaTesto(l.Tipologia) === normalizzaTesto(payload.Tipologia)
  );

  if (duplicato) {
    const conferma = confirm(
      "Esiste già una lezione con stessa data, ora e tipologia. Vuoi salvarla comunque?"
    );

    if (!conferma) {
      setStatus("Salvataggio lezione annullato", "err");
      return;
    }
  }

  const { error } = await supabaseClient
    .from("lezioni")
    .insert([payload]);

  if (error) {
    console.error("Errore salvaLezioneDaAgenda:", error);
    setStatus(`Errore salvataggio lezione da Agenda: ${error.message}`, "err");
    return;
  }

  pulisciFormLezioneAgenda();
  chiudiNuovaLezioneAgenda();

  await loadLezioni();
  await loadPrenotazioni();

  calendarioDataCorrente = Data;
  renderCalendario();

  setStatus("Lezione salvata da Agenda correttamente ✅", "ok");
}

function chiudiDettaglioAgendaSeAperto() {
  const dettaglioBox = document.getElementById("dettaglioCalendarioLezioneBox");

  if (dettaglioBox) {
    dettaglioBox.innerHTML = "";
    dettaglioBox.classList.add("hidden");
  }
}

function vaiOggiAgenda() {
  calendarioDataCorrente = getTodayString();

  const dataAgendaInput = document.getElementById("agenda_data");
  if (dataAgendaInput) {
    dataAgendaInput.value = calendarioDataCorrente;
  }

  chiudiDettaglioAgendaSeAperto();
  renderCalendario();
}

function getAgendaStatsGiorno(lezioniGiorno) {
  const totaleLezioni = lezioniGiorno.length;

  const totalePosti = lezioniGiorno.reduce((sum, l) => {
    return sum + Number(l.Max_Partecipanti || 0);
  }, 0);

  const totalePrenotati = lezioniGiorno.reduce((sum, l) => {
    const prenotati = prenotazioniData.filter(p =>
      String(p.ID_Lezione) === String(l.ID_Lezione)
    ).length;

    return sum + prenotati;
  }, 0);

  const postiLiberi = Math.max(totalePosti - totalePrenotati, 0);

  return {
    totaleLezioni,
    totalePosti,
    totalePrenotati,
    postiLiberi
  };
}

function renderCalendario() {
  const out = document.getElementById("outputCalendario");
  const label = document.getElementById("calendarioDataLabel");

  if (!out || !label) return;

  label.textContent = formatDataEstesaIt(calendarioDataCorrente);

  const dataAgendaInput = document.getElementById("agenda_data");
  if (dataAgendaInput) {
    dataAgendaInput.value = calendarioDataCorrente;
  }

  const lezioniGiorno = lezioniData
    .filter(l => l.Data === calendarioDataCorrente)
    .sort((a, b) => String(a.Ora || "").localeCompare(String(b.Ora || "")));

  if (!lezioniGiorno.length) {
    out.innerHTML = `
      <div class="agenda-day-summary">
        📊 Nessuna lezione programmata per questo giorno.
      </div>

      <div class="card-ios">
        <div class="card-title">Nessuna lezione</div>
        <div class="card-sub">📭 Usa “Aggiungi lezione” per creare una nuova lezione in questa giornata.</div>
      </div>
    `;
    return;
  }

  const stats = getAgendaStatsGiorno(lezioniGiorno);

  const summaryHtml = `
    <div class="agenda-day-summary">
      📊 ${stats.totaleLezioni} lezioni · 
      👥 ${stats.totalePrenotati}/${stats.totalePosti} prenotazioni · 
      🟢 ${stats.postiLiberi} posti liberi
    </div>
  `;

  const cardsHtml = lezioniGiorno.map(l => {
    const prenotati = prenotazioniData.filter(p =>
      String(p.ID_Lezione) === String(l.ID_Lezione)
    ).length;

    const max = Number(l.Max_Partecipanti || 0);
    const rimasti = Math.max(max - prenotati, 0);

    let statoClasse = "agenda-lesson-empty";
    let statoPillClasse = "agenda-status-empty";
    let statoTesto = "Disponibile";

    if (prenotati > 0 && prenotati < max) {
      statoClasse = "agenda-lesson-partial";
      statoPillClasse = "agenda-status-partial";
      statoTesto = "Parziale";
    }

    if (max > 0 && prenotati >= max) {
      statoClasse = "agenda-lesson-full";
      statoPillClasse = "agenda-status-full";
      statoTesto = "Piena";
    }

    return `
      <div class="card-ios ${statoClasse}">

        <div class="agenda-lesson-time">
          ${safe(formatOraHHMM(l.Ora))}
        </div>

        <div class="agenda-lesson-type">
          ${safe(l.Tipologia)}
        </div>

        <div class="card-sub">
          👤 ${safe(l.Istruttore)}
        </div>

        <div class="card-sub">
          👥 ${prenotati}/${max} · Rimasti: ${rimasti}
        </div>

        <span class="agenda-status-pill ${statoPillClasse}">
          ${statoTesto}
        </span>

        <div class="card-actions">
          <button onclick="mostraDettaglioLezione('${escapeQuote(l.ID_Lezione)}', 'dettaglioCalendarioLezioneBox')">
            👁️ Apri
          </button>

          <button onclick="eliminaLezioneDaAgenda('${escapeQuote(l.ID_Lezione)}')">
            🗑️ Elimina
          </button>
        </div>

      </div>
    `;
  }).join("");

  out.innerHTML = summaryHtml + cardsHtml;
}

function giornoPrecedente() {
  const d = new Date(calendarioDataCorrente + "T00:00:00");
  d.setDate(d.getDate() - 1);
  calendarioDataCorrente = formatDateLocal(d);

  const dataAgendaInput = document.getElementById("agenda_data");
  if (dataAgendaInput) {
    dataAgendaInput.value = calendarioDataCorrente;
  }

  chiudiDettaglioAgendaSeAperto();
  renderCalendario();
}

function giornoSuccessivo() {
  const d = new Date(calendarioDataCorrente + "T00:00:00");
  d.setDate(d.getDate() + 1);
  calendarioDataCorrente = formatDateLocal(d);

  const dataAgendaInput = document.getElementById("agenda_data");
  if (dataAgendaInput) {
    dataAgendaInput.value = calendarioDataCorrente;
  }

  chiudiDettaglioAgendaSeAperto();
  renderCalendario();
}

async function eliminaLezioneDaAgenda(idLezione) {
  if (!confirm("Eliminare questa lezione e le prenotazioni collegate?")) return;

  const { error: errorPren } = await supabaseClient
    .from("prenotazioni")
    .delete()
    .eq("ID_Lezione", idLezione);

  if (errorPren) {
    console.error("Errore eliminazione prenotazioni da Agenda:", errorPren);
    setStatus(`Errore eliminazione prenotazioni collegate: ${errorPren.message}`, "err");
    return;
  }

  const { error } = await supabaseClient
    .from("lezioni")
    .delete()
    .eq("ID_Lezione", idLezione);

  if (error) {
    console.error("Errore eliminazione lezione da Agenda:", error);
    setStatus(`Errore eliminazione lezione: ${error.message}`, "err");
    return;
  }

  chiudiDettaglioAgendaSeAperto();

  await loadLezioni();
  await loadPrenotazioni();

  renderCalendario();

  setStatus("Lezione eliminata da Agenda correttamente ✅", "ok");
}





function inviaWhatsAppCliente(idCliente) {
  mostraSceltaWhatsApp(idCliente);
}


function mostraSceltaWhatsApp(idCliente) {
  chiudiWA();

  const cliente = clientiData.find(c => String(c.ID_Cliente) === String(idCliente));

  if (!cliente) {
    setStatus("Cliente non trovato per WhatsApp", "err");
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "wa-choice-overlay";
  overlay.id = "waChoiceOverlay";

  overlay.innerHTML = `
    <div class="wa-choice-box">

      <button onclick="inviaWhatsAppClienteConScelta('${escapeQuote(idCliente)}', 'lezioni')">
        📅 Lezioni
      </button>

      <button onclick="inviaWhatsAppClienteConScelta('${escapeQuote(idCliente)}', 'pacchetti')">
        🎟️ Pacchetti
      </button>

      <button onclick="inviaWhatsAppClienteConScelta('${escapeQuote(idCliente)}', 'entrambi')">
        📊 Entrambi
      </button>

      <button onclick="chiudiWA()">
        Annulla
      </button>

    </div>
  `;

  document.body.appendChild(overlay);
}

function chiudiWA() {
  const el = document.getElementById("waChoiceOverlay");
  if (el) el.remove();
}

function inviaWhatsAppClienteConScelta(idCliente, scelta) {

  chiudiWA();

  const cliente = clientiData.find(c => String(c.ID_Cliente) === String(idCliente));
  if (!cliente) {
    setStatus("Cliente non trovato per WhatsApp", "err");
    return;
  }

  const telefonoPulito = String(cliente.Telefono || "").replace(/\D/g, "");
  if (!telefonoPulito) {
    setStatus("Numero telefono mancante per WhatsApp", "err");
    return;
  }

  const storico = prenotazioniData
    .filter(p => String(p.ID_Cliente) === String(idCliente))
    .map(p => {
      const l = lezioniData.find(x => String(x.ID_Lezione) === String(p.ID_Lezione));
      return {
        Data: l ? l.Data : "",
        Ora: l ? l.Ora : "",
        Tipologia: l ? l.Tipologia : "",
        lezioneTrovata: !!l
      };
    })
    .sort((a, b) => {
      const aKey = `${a.Data || ""} ${a.Ora || ""}`;
      const bKey = `${b.Data || ""} ${b.Ora || ""}`;
      return bKey.localeCompare(aKey);
    });

  const listaLezioni = storico.length
    ? storico.map(l => {
        if (!l.lezioneTrovata) return "- Lezione non trovata";
        return `- ${l.Data} ${formatOraHHMM(l.Ora)} - ${l.Tipologia}`;
      }).join("\n")
    : "- Nessuna lezione registrata";

  const pacchetti = pacchettiData
    .filter(p => String(p.ID_Cliente) === String(idCliente))
    .sort((a, b) => String(b.Valido_Da || "").localeCompare(String(a.Valido_Da || "")))
    .map(p => {
      const usate = contaPrenotazioniPacchetto(p.ID_Pacchetto);
      const tot = Number(p.Lezioni_Totali || 0);
      const saldo = tot - usate;
      const tipo = getTipologiaPacchetto(p.Tipo_Pacchetto);
      return `- ${tipo}: ${tot} lezioni | fatte ${usate} | saldo ${saldo} | ${p.Stato || "Attivo"}`;
    }).join("\n");

  let testo = `Ciao ${cliente.Nome || ""},\n\n`;

  if (scelta === "lezioni") {
    testo += `Lezioni effettuate: ${storico.length}\n\n`;
    testo += `Lista lezioni:\n${listaLezioni}`;
  }

  if (scelta === "pacchetti") {
    testo += `Pacchetti:\n${pacchetti || "- Nessun pacchetto registrato"}`;
  }

  if (scelta === "entrambi") {
    testo += `Lezioni effettuate: ${storico.length}\n\n`;
    testo += `Pacchetti:\n${pacchetti || "- Nessun pacchetto registrato"}\n\n`;
    testo += `Lista lezioni:\n${listaLezioni}`;
  }

  const link = `https://wa.me/${telefonoPulito}?text=${encodeURIComponent(testo)}`;
  window.open(link, "_blank");
}



function vaiADataAgenda() {
  const val = document.getElementById("agendaDatePicker")?.value;

  if (!val) return;

  calendarioDataCorrente = val;
  renderCalendario();
}

function settimanaPrecedente() {
  const d = new Date(calendarioDataCorrente);
  d.setDate(d.getDate() - 7);

  calendarioDataCorrente = d.toISOString().slice(0, 10);
  renderCalendario();
}

function settimanaSuccessiva() {
  const d = new Date(calendarioDataCorrente);
  d.setDate(d.getDate() + 7);

  calendarioDataCorrente = d.toISOString().slice(0, 10);
  renderCalendario();
}

/* ===================== DASHBOARD RICAVI ===================== */

function formatEuro(value) {
  const numero = Number(value || 0);

  return numero.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function getRicavoPrenotazione(p) {
  const lezione = lezioniData.find(l =>
    String(l.ID_Lezione) === String(p.ID_Lezione)
  );

  const pacchetto = pacchettiData.find(pk =>
    String(pk.ID_Pacchetto) === String(p.ID_Pacchetto)
  );

  if (!lezione || !pacchetto) {
    return null;
  }

  const prezzoPacchetto = Number(pacchetto.Prezzo || 0);
  const lezioniTotali = Number(pacchetto.Lezioni_Totali || 0);

  if (!prezzoPacchetto || !lezioniTotali) {
    return null;
  }

  const prezzoPerLezione = prezzoPacchetto / lezioniTotali;

  return {
    ID_Prenotazione: p.ID_Prenotazione,
    ID_Cliente: p.ID_Cliente,
    ID_Lezione: p.ID_Lezione,
    ID_Pacchetto: p.ID_Pacchetto,
    Data: lezione.Data || "",
    Ora: lezione.Ora || "",
    Tipologia: lezione.Tipologia || "",
    GiornoSettimana: getGiornoSettimanaIndex(lezione.Data),
    Settimana: getWeekKey(lezione.Data),
    Mese: String(lezione.Data || "").slice(0, 7),
    Ricavo: prezzoPerLezione
  };
}

function getRicaviPrenotazioniValide() {
  return prenotazioniData
    .map(p => getRicavoPrenotazione(p))
    .filter(item => item && item.Data && item.Mese);
}

function getGiornoSettimanaIndex(dateString) {
  if (!dateString) return null;

  const d = new Date(dateString + "T00:00:00");
  return d.getDay();
}

function getMondayDate(dateString) {
  const d = new Date(dateString + "T00:00:00");
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diffToMonday);

  return d;
}

function getWeekKey(dateString) {
  if (!dateString) return "";

  return formatDateLocal(getMondayDate(dateString));
}

function getWeekLabel(weekKey) {
  if (!weekKey) return "";

  const start = new Date(weekKey + "T00:00:00");
  const end = new Date(start);

  end.setDate(start.getDate() + 6);

  return `${formatDateLocal(start)} → ${formatDateLocal(end)}`;
}

function getUltimiMesiDaRicavi(ricavi, quantita = 6) {
  const mesi = Array.from(new Set(
    ricavi
      .map(r => r.Mese)
      .filter(Boolean)
  )).sort();

  return mesi.slice(-quantita).reverse();
}

function getUltimeSettimaneDaRicavi(ricavi, quantita = 8) {
  const settimane = Array.from(new Set(
    ricavi
      .map(r => r.Settimana)
      .filter(Boolean)
  )).sort();

  return settimane.slice(-quantita).reverse();
}

function calcolaDashboardMensile() {
  const ricavi = getRicaviPrenotazioniValide();
  const mesiDaMostrare = getUltimiMesiDaRicavi(ricavi, 6);

  const result = {};

  mesiDaMostrare.forEach(mese => {
    result[mese] = {
      Privata: 0,
      Duetto: 0,
      "Mini-Gruppo": 0,
      Totale: 0
    };
  });

  ricavi.forEach(item => {
    if (!result[item.Mese]) return;

    const tipologia = item.Tipologia || "Altro";

    if (!result[item.Mese][tipologia]) {
      result[item.Mese][tipologia] = 0;
    }

    result[item.Mese][tipologia] += item.Ricavo;
    result[item.Mese].Totale += item.Ricavo;
  });

  renderDashboardMensile(result);
  renderDashboardKpiMensile(result);
}

function renderDashboardMensile(data) {
  const out = document.getElementById("dashboardMensile");
  if (!out) return;

  const entries = Object.entries(data);

  if (!entries.length) {
    out.innerHTML = `
      <div class="dashboard-card">
        <div class="dashboard-card-title">Nessun dato mensile</div>
        <div class="dashboard-line">
          Non ci sono prenotazioni con pacchetto associato e prezzo valido.
        </div>
      </div>
    `;
    return;
  }

  out.innerHTML = entries.map(([mese, valori]) => {
    const privata = valori.Privata || 0;
    const duetto = valori.Duetto || 0;
    const mini = valori["Mini-Gruppo"] || 0;
    const totale = valori.Totale || 0;

    return `
      <div class="dashboard-card">
        <div class="dashboard-card-title">${safe(mese)}</div>

        <div class="dashboard-line">Privata: ${formatEuro(privata)}</div>
        <div class="dashboard-line">Duetto: ${formatEuro(duetto)}</div>
        <div class="dashboard-line">Mini-Gruppo: ${formatEuro(mini)}</div>

        <div class="dashboard-total">
          Totale: ${formatEuro(totale)}
        </div>
      </div>
    `;
  }).join("");
}

function renderDashboardKpiMensile(dataMensile) {
  const out = document.getElementById("dashboardKpiMese");
  if (!out) return;

  const meseCorrente = getTodayString().slice(0, 7);
  const valore = dataMensile[meseCorrente]?.Totale || 0;

  out.textContent = formatEuro(valore);
}

function calcolaDashboardSettimanale() {
  const ricavi = getRicaviPrenotazioniValide();
  const settimaneDaMostrare = getUltimeSettimaneDaRicavi(ricavi, 8);

  const result = {};

  settimaneDaMostrare.forEach(settimana => {
    result[settimana] = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      0: 0,
      Totale: 0
    };
  });

  ricavi.forEach(item => {
    if (!result[item.Settimana]) return;

    const giorno = item.GiornoSettimana;

    if (giorno === null || giorno === undefined) return;

    result[item.Settimana][giorno] += item.Ricavo;
    result[item.Settimana].Totale += item.Ricavo;
  });

  renderDashboardSettimanale(result);
  renderDashboardKpiSettimanale(result);
}

function renderDashboardSettimanale(data) {
  const out = document.getElementById("dashboardSettimanale");
  if (!out) return;

  const entries = Object.entries(data);

  if (!entries.length) {
    out.innerHTML = `
      <div class="dashboard-card">
        <div class="dashboard-card-title">Nessun dato settimanale</div>
        <div class="dashboard-line">
          Non ci sono prenotazioni con pacchetto associato e prezzo valido.
        </div>
      </div>
    `;
    return;
  }

  out.innerHTML = entries.map(([settimana, valori]) => {
    return `
      <div class="dashboard-card">
        <div class="dashboard-card-title">
          Settimana ${safe(getWeekLabel(settimana))}
        </div>

        <table class="dashboard-mini-table">
          <tr>
            <th>Giorno</th>
            <th>Ricavi</th>
          </tr>
          <tr>
            <td>Lunedì</td>
            <td>${formatEuro(valori[1] || 0)}</td>
          </tr>
          <tr>
            <td>Martedì</td>
            <td>${formatEuro(valori[2] || 0)}</td>
          </tr>
          <tr>
            <td>Mercoledì</td>
            <td>${formatEuro(valori[3] || 0)}</td>
          </tr>
          <tr>
            <td>Giovedì</td>
            <td>${formatEuro(valori[4] || 0)}</td>
          </tr>
          <tr>
            <td>Venerdì</td>
            <td>${formatEuro(valori[5] || 0)}</td>
          </tr>
          <tr>
            <td>Sabato</td>
            <td>${formatEuro(valori[6] || 0)}</td>
          </tr>
          <tr>
            <td>Domenica</td>
            <td>${formatEuro(valori[0] || 0)}</td>
          </tr>
        </table>

        <div class="dashboard-total">
          Totale: ${formatEuro(valori.Totale || 0)}
        </div>
      </div>
    `;
  }).join("");
}

function renderDashboardKpiSettimanale(dataSettimanale) {
  const out = document.getElementById("dashboardKpiSettimana");
  if (!out) return;

  const settimanaCorrente = getWeekKey(getTodayString());
  const valore = dataSettimanale[settimanaCorrente]?.Totale || 0;

  out.textContent = formatEuro(valore);
}



console.log("APP JS CARICATO OK");
