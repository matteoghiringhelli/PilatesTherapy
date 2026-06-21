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
let searchClienti = "";


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

function formatOraHHMM(value) {
  return String(value || "").substring(0, 5);
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

    return (
      nome.includes(searchClienti) ||
      cognome.includes(searchClienti) ||
      telefono.includes(searchClienti) ||
      email.includes(searchClienti)
    );
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
            <td>${safe((l.Ora || "").substring(0,5))}</td>
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
      ID_Prenotazione: "PR" + Date.now(),
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
    window.scrollTo({
      top: section.offsetTop - 20,
      behavior: "smooth"
    });
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

    <div class="card-sub">📞 ${telefono}</div>
    <div class="card-sub">📧 ${email}</div>

    <div class="card-actions">
      <button onclick="inviaWhatsAppCliente('${escapeQuote(id)}')">📲 WhatsApp</button>
      ${azioni}
      <button onclick="mostraPacchettiCliente('${escapeQuote(id)}')">🎟️ Pacchetti</button>
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
        ${lezione.Data} - ${formatOraHHMM(lezione.Ora)}
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
        <button onclick="inviaWhatsAppCliente('${escapeQuote(cliente.ID_Cliente)}')">📲 WhatsApp</button>
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

      <div class="card-actions">
        <button onclick="inviaWhatsAppCliente('${escapeQuote(cliente.ID_Cliente)}')">📲 WhatsApp</button>
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
        <div class="card-sub">📌 Stato: ${p.Stato || "Valido"}</div>
      </div>
    `;
  }).join("");

  box.innerHTML = `
    <div class="card-ios">
      <div class="card-title">Pacchetti ${cliente.Nome}</div>
      ${html || "<p>Nessun pacchetto</p>"}
      <div class="card-actions">
        <button onclick="renderClienti()">← Indietro</button>
      </div>
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
  const clientiSection = document.getElementById("clientiSection");
  const lezioniSection = document.getElementById("lezioniSection");
  const prenotazioniSection = document.getElementById("prenotazioniSection");
  const pacchettiSection = document.getElementById("pacchettiSection");

  const tabClienti = document.getElementById("tabClienti");
  const tabLezioni = document.getElementById("tabLezioni");
  const tabPrenotazioni = document.getElementById("tabPrenotazioni");
  const tabPacchetti = document.getElementById("tabPacchetti");

  const clientiWrapper = clientiSection?.parentElement;
  const lezioniWrapper = lezioniSection?.parentElement;
  const prenotazioniWrapper = prenotazioniSection?.parentElement;
  const pacchettiWrapper = pacchettiSection?.parentElement;

  const wrappers = [
    clientiWrapper,
    lezioniWrapper,
    prenotazioniWrapper,
    pacchettiWrapper
  ];

  wrappers.forEach(wrapper => {
    if (wrapper) wrapper.classList.remove("active-section");
  });

  [tabClienti, tabLezioni, tabPrenotazioni, tabPacchetti].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

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
  const saldoWarning = document.getElementById("pac_saldo_warning");

  const lezioniBase = tipo ? Number(tipo.Lezioni_Base || 0) : 0;

  let saldoNegativoDaTrasferire = 0;

  if (clienteValue && tipo) {
    saldoNegativoDaTrasferire = getSaldoNegativoPrecedente(clienteValue, tipo.Tipologia);
  }

  if (lezioniAddInput && !lezioniAddManuale) {
    lezioniAddInput.value = saldoNegativoDaTrasferire < 0
      ? String(saldoNegativoDaTrasferire)
      : "0";
  }

  const lezioniAdd = Number(lezioniAddInput?.value || 0);
  const lezioniTotali = lezioniBase + lezioniAdd;

  if (lezioniBaseInput) lezioniBaseInput.value = tipo ? lezioniBase : "";
  if (lezioniTotaliInput) lezioniTotaliInput.value = tipo ? lezioniTotali : "";

  if (saldoWarning) {
    if (saldoNegativoDaTrasferire < 0 && !lezioniAddManuale) {
      saldoWarning.textContent =
        `Saldo negativo precedente rilevato: ${saldoNegativoDaTrasferire}. Il nuovo pacchetto parte già rettificato.`;
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
    validoAInput.value = tipo && validoDaInput?.value
      ? aggiungiMesiAData(validoDaInput.value, tipo.Scadenza_Mesi)
      : "";
  }

  const flagC = flagCInput?.value || "Si";

  if (fatturaNrInput) {
    if (flagC === "No") {
      fatturaNrInput.disabled = false;
      fatturaNrInput.placeholder = "Fattura Nr obbligatoria";
    } else {
      fatturaNrInput.disabled = true;
      fatturaNrInput.value = "";
      fatturaNrInput.placeholder = "Fattura Nr non richiesta";
    }
  }
}

function generaNuovoIdPacchetto() {
  const numeri = pacchettiData
    .map(p => String(p.ID_Pacchetto || ""))
    .filter(id => /^PC\d+$/.test(id))
    .map(id => Number(id.replace("PC", "")))
    .filter(n => !Number.isNaN(n));

  if (!numeri.length) {
    return "PC000001";
  }

  const prossimoNumero = Math.max(...numeri) + 1;
  return "PC" + String(prossimoNumero).padStart(6, "0");
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

  if (Flag_C === "No" && !Fattura_Nr) {
    setStatus("Fattura Nr obbligatoria quando Flag C = No", "err");
    return;
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

    const table = out.querySelector("table");
    if (!table) return;

    const rows = table.querySelectorAll("tr");
    if (!rows || rows.length <= 1) return;

    const cards = [];

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll("td");
      if (!cells || cells.length < 16) continue;

      const idPacchetto = cells[0].innerText;
      const cliente = cells[1].innerText;
      const idCliente = cells[2].innerText;
      const tipo = cells[3].innerText;
      const base = cells[4].innerText;
      const add = cells[5].innerText;
      const totali = cells[6].innerText;
      const prezzo = cells[7].innerText;
      const pagato = cells[8].innerText;
      const flagC = cells[9].innerText;
      const daPagare = cells[10].innerText;
      const fatturaNr = cells[11].innerText;
      const dataFattura = cells[12].innerText;
      const validoDa = cells[13].innerText;
      const validoA = cells[14].innerText;
      const stato = cells[15].innerText;

      cards.push(`
        <div class="card-ios">
          <div class="card-title">
            🎟️ ${tipo}
          </div>

          <div class="card-sub">
            👤 ${cliente}
          </div>

          <div class="card-sub">
            🆔 Pacchetto: ${idPacchetto}
          </div>

          <div class="card-sub">
            ID Cliente: ${idCliente}
          </div>

          <div class="card-sub">
            📊 Lezioni: ${totali} — Base: ${base} — Add: ${add}
          </div>

          <div class="card-sub">
            💰 Prezzo: ${prezzo} — Da pagare: ${daPagare}
          </div>

          <div class="card-sub">
            Pagato: ${pagato} — Flag C: ${flagC}
          </div>

          <div class="card-sub">
            Fattura: ${fatturaNr || "-"} — Data: ${dataFattura || "-"}
          </div>

          <div class="card-sub">
            📅 Validità: ${validoDa} → ${validoA}
          </div>

          <div class="card-sub">
            Stato: ${stato || "Valido"}
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
    console.error("Errore renderPacchettiMobileSafe:", err);
  }
}

/* ===================== REPORT PACCHETTI ===================== */

function getClienteById(idCliente) {
  return clientiData.find(c => String(c.ID_Cliente) === String(idCliente));
}

function isPacchettoChiuso(pacchetto) {
  return normalizzaTesto(pacchetto?.Stato || "") === "chiuso";
}

function isPacchettoScaduto(pacchetto) {
  if (!pacchetto || !pacchetto.Valido_A) return false;
  return String(pacchetto.Valido_A) < getTodayString();
}

function getGiorniAllaScadenza(dateString) {
  if (!dateString) return null;

  const oggi = new Date(`${getTodayString()}T00:00:00`);
  const scadenza = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(scadenza.getTime())) return null;

  const diffMs = scadenza.getTime() - oggi.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getAvvisiReportPacchetto(pacchetto) {
  const avvisi = [];

  if (!pacchetto) return avvisi;

  const lezioniTotali = Number(pacchetto.Lezioni_Totali || 0);
  const lezioniEffettuate = contaPrenotazioniPacchetto(pacchetto.ID_Pacchetto);
  const saldo = lezioniTotali - lezioniEffettuate;
  const daPagare = Number(pacchetto.Da_Pagare || 0);
  const giorniScadenza = getGiorniAllaScadenza(pacchetto.Valido_A);

  if (saldo < 0) {
    avvisi.push({
      tipo: "rosso",
      testo: `Saldo negativo: ${saldo}`
    });
  } else if (saldo === 0) {
    avvisi.push({
      tipo: "rosso",
      testo: "Pacchetto esaurito"
    });
  } else if (lezioniTotali > 3 && saldo <= 3) {
    avvisi.push({
      tipo: "giallo",
      testo: `Lezioni residue basse: ${saldo}`
    });
  }

  if (isPacchettoScaduto(pacchetto)) {
    avvisi.push({
      tipo: "rosso",
      testo: `Pacchetto scaduto il ${pacchetto.Valido_A}`
    });
  } else if (giorniScadenza !== null && giorniScadenza <= 14) {
    avvisi.push({
      tipo: "giallo",
      testo: `Scadenza vicina: ${giorniScadenza} giorni`
    });
  }

  if (daPagare > 0) {
    avvisi.push({
      tipo: "blu",
      testo: `Da pagare: ${daPagare}`
    });
  }

  return avvisi;
}

function getClasseReportPacchetto(avvisi) {
  if (avvisi.some(a => a.tipo === "rosso")) return "report-red";
  if (avvisi.some(a => a.tipo === "giallo")) return "report-yellow";
  if (avvisi.some(a => a.tipo === "blu")) return "report-blue";
  return "report-green";
}

function getReportPacchettiData() {
  return pacchettiData
    .filter(p => !isPacchettoChiuso(p))
    .map(p => {
      const cliente = getClienteById(p.ID_Cliente);
      const lezioniTotali = Number(p.Lezioni_Totali || 0);
      const lezioniEffettuate = contaPrenotazioniPacchetto(p.ID_Pacchetto);
      const saldo = lezioniTotali - lezioniEffettuate;
      const avvisi = getAvvisiReportPacchetto(p);
      const tipologia = getTipologiaPacchetto(p.Tipo_Pacchetto);

      return {
        pacchetto: p,
        cliente,
        tipologia,
        lezioniTotali,
        lezioniEffettuate,
        saldo,
        avvisi
      };
    })
    .filter(item => item.avvisi.length > 0)
    .sort((a, b) => {
      const priorita = item => {
        if (item.avvisi.some(x => x.tipo === "rosso")) return 1;
        if (item.avvisi.some(x => x.tipo === "giallo")) return 2;
        if (item.avvisi.some(x => x.tipo === "blu")) return 3;
        return 4;
      };

      const pA = priorita(a);
      const pB = priorita(b);

      if (pA !== pB) return pA - pB;

      return String(a.pacchetto.Valido_A || "").localeCompare(String(b.pacchetto.Valido_A || ""));
    });
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

function renderReportPacchetti() {
  const out = document.getElementById("outputReportPacchetti");
  if (!out) return;

  const report = getReportPacchettiData();

  const totaleAperti = pacchettiData.filter(p => !isPacchettoChiuso(p)).length;
  const alertRossi = report.filter(r => r.avvisi.some(a => a.tipo === "rosso")).length;
  const alertGialli = report.filter(r => r.avvisi.some(a => a.tipo === "giallo")).length;
  const daPagare = report.filter(r => r.avvisi.some(a => a.tipo === "blu")).length;

  if (!report.length) {
    out.innerHTML = `
      <div class="report-summary">
        <div class="report-pill">Pacchetti aperti: ${totaleAperti}</div>
        <div class="report-pill">Criticità: 0</div>
      </div>

      <div class="card-ios">
        <div class="card-title">✅ Nessun pacchetto critico</div>
        <div class="card-sub">
          Non risultano pacchetti aperti con saldo basso, saldo negativo, scadenza critica o importi da pagare.
        </div>
      </div>
    `;
    return;
  }

  out.innerHTML = `
    <div class="report-summary">
      <div class="report-pill">Pacchetti aperti: ${totaleAperti}</div>
      <div class="report-pill">Criticità totali: ${report.length}</div>
      <div class="report-pill">🔴 Rossi: ${alertRossi}</div>
      <div class="report-pill">🟡 Gialli: ${alertGialli}</div>
      <div class="report-pill">💰 Da pagare: ${daPagare}</div>
    </div>

    ${report.map(item => {
      const p = item.pacchetto;
      const clienteNome = item.cliente
        ? `${safe(item.cliente.Nome)} ${safe(item.cliente.Cognome)}`
        : "Cliente non trovato";

      const classe = getClasseReportPacchetto(item.avvisi);

      return `
        <div class="report-card ${classe}">
          <div class="report-title">
            <button onclick="mostraPacchettiCliente('${escapeQuote(item.cliente.ID_Cliente)}')">📅 Prenotazioni</button>
            ${clienteNome}
          </button>
</div>

          <div class="report-line">
            🎟️ ${safe(p.ID_Pacchetto)} — ${safe(p.Tipo_Pacchetto)} — ${safe(item.tipologia)}
          </div>

          <div class="report-line">
            📅 Validità: ${safe(p.Valido_Da)} → ${safe(p.Valido_A)}
          </div>

          <div class="report-line">
            📊 Totali: ${item.lezioniTotali} | Effettuate: ${item.lezioniEffettuate} | Saldo: ${item.saldo}
          </div>

          <div class="report-line">
            💰 Prezzo: ${safe(p.Prezzo)} | Da pagare: ${safe(p.Da_Pagare)}
          </div>

          <div class="report-line">
            📌 Stato: ${safe(p.Stato || "Valido")}
          </div>

          <div class="report-warning">
            ${item.avvisi.map(a => `⚠️ ${safe(a.testo)}`).join("<br>")}
          </div>

          <div class="card-actions">
            ${
              item.cliente
                ? `<button onclick="inviaWhatsAppCliente('${escapeQuote(item.cliente.ID_Cliente)}')">📲 WhatsApp</button>`
                : ""
            }
            ${
              item.cliente
                ? `<button onclick="mostraPacchettiCliente('${escapeQuote(item.cliente.ID_Cliente)}')">🎟️ Dettaglio Pacchetti</button>`
                : ""
            }
          </div>
        </div>
      `;
    }).join("")}
  `;
}

function inviaWhatsAppCliente(idCliente) {
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
      const dataOraA = `${a.Data || ""} ${a.Ora || ""}`;
      const dataOraB = `${b.Data || ""} ${b.Ora || ""}`;
      return dataOraB.localeCompare(dataOraA);
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

      return `- ${tipo}: ${tot} lezioni | fatte ${usate} | saldo ${saldo} | ${p.Stato || "Valido"}`;
    }).join("\n");

  const testo = `
Ciao ${cliente.Nome || ""},

Lezioni effettuate: ${storico.length}

Lista lezioni:
${listaLezioni}

Pacchetti:
${pacchetti || "- Nessun pacchetto registrato"}
  `.trim();

  const link = `https://wa.me/${telefonoPulito}?text=${encodeURIComponent(testo)}`;

  window.open(link, "_blank");
}

console.log("APP JS CARICATO OK");
