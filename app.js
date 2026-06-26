// ============================
// ✅ SAFE DB HELPERS
// ============================

function requireUser() {
  if (!window.currentUserId) {
    throw new Error("Utente non autenticato");
  }
}

function withUserId(payload) {
  requireUser();

  if (Array.isArray(payload)) {
    return payload.map(item => ({
      ...item,
      user_id: window.currentUserId
    }));
  }

  return {
    ...payload,
    user_id: window.currentUserId
  };
}

async function safeInsert(table, payload) {
  try {
    requireUser();

    const payloadConUser = withUserId(payload);

    const { data, error } = await supabaseClient
      .from(table)
      .insert(payloadConUser)
      .select();

    if (error) throw error;

    return data || [];

  } catch (error) {
    console.error(`Errore INSERT su ${table}:`, error);
    setStatus("Errore salvataggio dati", "err");
    throw error;
  }
}

async function safeUpdate(table, payload, match) {
  try {
    requireUser();

    const { data, error } = await supabaseClient
      .from(table)
      .update(payload)
      .match(match)
      .select();

    if (error) throw error;
    return data;

  } catch (error) {
    console.error(`Errore UPDATE su ${table}:`, error);
    setStatus("Errore aggiornamento dati", "err");
    throw error;
  }
}

async function safeDelete(table, match) {
  try {
    requireUser();

    const { error } = await supabaseClient
      .from(table)
      .delete()
      .match(match);

    if (error) throw error;

  } catch (error) {
    console.error(`Errore DELETE su ${table}:`, error);
    setStatus("Errore eliminazione", "err");
    throw error;
  }
}


const APP_VERSION = "v-pacchetti-edit-2026-06-22";

const MAX_PARTECIPANTI = {
  "Privata": 1,
  "Duetto": 2,
  "Mini-Gruppo": 4
};

const RIGHE_PER_PAGINA = 25;

let clientiData = [];
let lezioniData = [];
let prenotazioniData = [];

// ============================
// ✅ CONTI STUDIO STATE
// ============================

let contiData = [];
let contiDataOriginal = [];
let filtroConti = "tutti";
let filtroContiMese = "";


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
let graficoRicaviSettimanaliInstance = null;
let graficoRicaviMensiliTipologiaInstance = null;


// ============================
// PLUGIN TOTALI SOPRA COLONNE
// ============================

const pluginTotaliColonne = {
  id: 'totaliColonne',

  afterDatasetsDraw(chart) {

    const { ctx, data, scales } = chart;

    if (!data.datasets || !data.datasets.length) return;

    ctx.save();

    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";

    const labelsCount = data.labels.length;

    for (let i = 0; i < labelsCount; i++) {

      let totale = 0;

      // somma tutti i dataset (stack)
      chart.data.datasets.forEach(dataset => {
        const value = Number(dataset.data[i] || 0);
        totale += value;
      });

      if (totale === 0) continue;

      // prendi la posizione Y del punto più alto dello stack
      const meta = chart.getDatasetMeta(chart.data.datasets.length - 1);
      const element = meta.data[i];

      if (!element) continue;

      const posizioneY = element.y - 6;

      ctx.fillText(
        formatEuro(totale),
        element.x,
        posizioneY
      );
    }

    ctx.restore();
  }
};




window.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("APP VERSION:", APP_VERSION);

    // ============================
    // ✅ GUARDIA PAGINA LOGIN
    // ============================
    // app.js viene caricato anche da index.html.
    // Su index.html NON dobbiamo fare controllo auth dashboard,
    // altrimenti la pagina login ricarica se stessa in loop.
    const currentPath = window.location.pathname || "";
    const isLoginPage =
      currentPath.endsWith("/index.html") ||
      currentPath === "/" ||
      currentPath === "";

    if (isLoginPage) {
      console.log("Pagina login rilevata: init dashboard saltato");
      return;
    }

    // ============================
    // ✅ CONTROLLO AUTENTICAZIONE DASHBOARD
    // ============================

    let session = null;

    try {
      const response = await supabaseClient.auth.getSession();

      if (response && response.data && response.data.session) {
        session = response.data.session;
      }
    } catch (err) {
      console.error("Errore getSession:", err);
    }

    if (!session || !session.user) {
      console.warn("Utente non autenticato, redirect al login");
      window.location.href = "/index.html";
      return;
    }

    // ✅ salva utente globale
    window.currentUser = session.user;
    window.currentUserId = session.user.id;

    console.log("✅ User authenticated:", window.currentUserId);

    // ============================
    // APP INIT DASHBOARD
    // ============================
    generaOrari();

    await reloadAll();

    setTimeout(() => {
      vaiTab("home");
    }, 150);

    setStatus("Dashboard caricata ✅", "ok");

  } catch (error) {
    console.error("Errore inizializzazione:", error);
    setStatus("Errore caricamento app. Contattare supporto.", "err");
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

function toggleNuovaPrenotazione() {
  const box = document.getElementById("nuovaPrenotazioneBox");
  if (!box) return;

  box.classList.toggle("hidden");

  if (!box.classList.contains("hidden")) {
    applicaSmartDefaultsPrenotazione();

    box.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
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

/* ===================== SMART DEFAULTS ===================== */
const SMART_KEYS = {
  ultimoClientePrenotazione: "pt_ultimo_cliente_prenotazione",
  ultimaLezionePrenotazione: "pt_ultima_lezione_prenotazione",
  ultimaTipologiaLezione: "pt_ultima_tipologia_lezione",
  ultimoIstruttoreLezione: "pt_ultimo_istruttore_lezione",
  ultimoOrarioLezione: "pt_ultimo_orario_lezione"
};

function salvaSmartValue(key, value) {
  try {
    if (!key || value === undefined || value === null) return;
    localStorage.setItem(key, String(value));
  } catch (err) {
    console.warn("Smart storage non disponibile:", err);
  }
}

function leggiSmartValue(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch (err) {
    console.warn("Smart storage non disponibile:", err);
    return "";
  }
}

function selectContieneValore(selectEl, value) {
  if (!selectEl || !value) return false;

  const options = Array.from(selectEl.options || []);
  return options.some(opt => String(opt.value) === String(value));
}

function getProssimaLezioneDisponibileSmart() {
  const oggi = getTodayString();

  const lezioniCandidate = lezioniData
    .filter(l => String(l.Data || "") >= String(oggi))
    .filter(l => {
      const prenotati = prenotazioniData.filter(p =>
        String(p.ID_Lezione) === String(l.ID_Lezione)
      ).length;

      const max = Number(l.Max_Partecipanti || 0);
      return max > 0 && prenotati < max;
    })
    .sort((a, b) => {
      const keyA = `${a.Data || ""} ${formatOraHHMM(a.Ora)}`;
      const keyB = `${b.Data || ""} ${formatOraHHMM(b.Ora)}`;
      return keyA.localeCompare(keyB);
    });

  return lezioniCandidate.length > 0 ? lezioniCandidate[0] : null;
}

function applicaSmartDefaultsPrenotazione() {
  renderSelectClienti();
  renderSelectLezioni();

  const selectCliente = document.getElementById("select_cliente");
  const selectLezione = document.getElementById("select_lezione");

  const ultimoCliente = leggiSmartValue(SMART_KEYS.ultimoClientePrenotazione);
  const ultimaLezione = leggiSmartValue(SMART_KEYS.ultimaLezionePrenotazione);

  // cliente
  if (selectCliente && ultimoCliente && selectContieneValore(selectCliente, ultimoCliente)) {
    selectCliente.value = ultimoCliente;
  }

  // lezione
  if (selectLezione && ultimaLezione && selectContieneValore(selectLezione, ultimaLezione)) {
    selectLezione.value = ultimaLezione;
  } else if (selectLezione && !selectLezione.value) {
    const prossima = getProssimaLezioneDisponibileSmart();

    if (prossima && selectContieneValore(selectLezione, prossima.ID_Lezione)) {
      selectLezione.value = prossima.ID_Lezione;
    }
  }

  aggiornaPacchettiPrenotazione();

  // focus intelligente
  setTimeout(() => {
    if (selectCliente && !selectCliente.value) {
      selectCliente.focus();
    } else if (selectLezione && !selectLezione.value) {
      selectLezione.focus();
    }
  }, 80);
}

function ricordaSmartPrenotazione(idCliente, idLezione) {
  if (idCliente) {
    salvaSmartValue(SMART_KEYS.ultimoClientePrenotazione, idCliente);
  }

  if (idLezione) {
    salvaSmartValue(SMART_KEYS.ultimaLezionePrenotazione, idLezione);
  }
}

function ricordaSmartLezione(Tipologia, Istruttore, Ora) {
  if (Tipologia) {
    salvaSmartValue(SMART_KEYS.ultimaTipologiaLezione, Tipologia);
  }

  if (Istruttore) {
    salvaSmartValue(SMART_KEYS.ultimoIstruttoreLezione, Istruttore);
  }

  if (Ora) {
    salvaSmartValue(SMART_KEYS.ultimoOrarioLezione, Ora);
  }
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

/* ===================== ID UTILS =====================
   Estratti in /js/utils/id.js
===================== */

/* ===================== DATE UTILS =====================
   Estratti in /js/utils/date.js
   Nota: formatEuro è gestito da /js/utils/format.js
===================== */

/* ===================== UX ANIMAZIONI =====================
   Estratte in /js/utils/dom.js
===================== */

/* ===================== CLIENTI =====================
   Estratti in /js/modules/clienti.js
===================== */

/* ===================== LEZIONI =====================
   Estratte in /js/modules/lezioni.js
===================== */

/* ===================== PACCHETTI PER PRENOTAZIONI ===================== */

/* normalizzaTesto(value) estratta in /js/utils/format.js */

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

  try {
    await safeInsert("lezioni", payload);

    pulisciFormLezione();

    await loadLezioni();
    await loadPrenotazioni();

    setStatus("Lezione salvata correttamente ✅", "ok");

  } catch (error) {
    console.error("Errore aggiungiLezione:", error);
    setStatus("Errore salvataggio lezione", "err");
  }
}

async function eliminaLezione(id) {
  if (!confirm("Eliminare la lezione e le prenotazioni collegate?")) return;

  try {
    await safeDelete("prenotazioni", { ID_Lezione: id });
    await safeDelete("lezioni", { ID_Lezione: id });

    await loadLezioni();
    await loadPrenotazioni();

    setStatus("Lezione eliminata correttamente ✅", "ok");

  } catch (error) {
    console.error("Errore eliminaLezione:", error);
    setStatus("Errore eliminazione lezione", "err");
  }
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

/* ===================== PRENOTAZIONI =====================
   Estratte in /js/modules/prenotazioni.js
===================== */

/* ===================== AUTH ===================== */

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

/* ===================== UTILS ===================== */

/* safe(value) estratta in /js/utils/format.js */

/* escapeQuote(value) estratta in /js/utils/format.js */

/* escapeAttr(value) estratta in /js/utils/format.js */


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
      🧑‍🤝‍🧑 ${prenotati}/${max} • Rimasti: ${rimasti}
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
    // ✅ Solo mobile
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
      if (!cells || cells.length < 4) continue;

      const id = cells[0].innerText;
      const nome = cells[1].innerText;
      const cognome = cells[2].innerText;
      const telefono = cells[3].innerText;

      // ✅ Recupero info pacchetti
      const residui = getLezioniResiduePerTipologia(id);

      const righeResiduo = Object.entries(residui || {})
        .map(([tipo, val]) => `• ${tipo}: ${val}`)
        .join("<br>");

      cards.push(`
        <div class="card-ios">

          <div class="card-title">
            ${safe(nome)} ${safe(cognome)}
          </div>

          <div class="card-sub">
            📞 ${safe(telefono || "-")}
          </div>

          ${
            righeResiduo
              ? `<div class="card-sub">
                   🎯<br>${righeResiduo}
                 </div>`
              : ""
          }

          <div class="card-actions">

            <button onclick="mostraSchedaCliente('${escapeQuote(id)}')">
              🔎 Scheda
            </button>

            <button onclick="apriIncassoCliente('${escapeQuote(id)}')">
              💳 Incasso
            </button>

            <button onclick="mostraPacchettiCliente('${escapeQuote(id)}')">
              🎟️ Pacchetti
            </button>

            <button onclick="mostraPrenotazioniCliente('${escapeQuote(id)}')">
              📅 Prenotazioni
            </button>

            <button onclick="inviaWhatsAppCliente('${escapeQuote(id)}')">
              📲 WhatsApp
            </button>

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

  const lezione = lezioniData.find(l =>
    String(l.ID_Lezione) === String(idLezione)
  );

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
      <button class="app-back-btn" onclick="chiudiDettaglioLezione('${escapeQuote(boxId)}')">
        ← Indietro
      </button>
    </div>

    <div class="view-content">

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

  try {
    const data = await safeInsert("prenotazioni", payload);

    if (!data || !data.length) {
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

  } catch (error) {
    console.error("Errore salvaPrenotazioniDaLezione:", error);
    setStatus("Errore salvataggio prenotazioni", "err");
  }
}

async function eliminaPrenotazioneDaLezione(idPrenotazione, idLezione) {
  if (!confirm("Eliminare questa prenotazione?")) return;

  try {
    await safeDelete("prenotazioni", { ID_Prenotazione: idPrenotazione });

    await loadPrenotazioni();
    await loadPacchetti();

    const reportBox = document.getElementById("reportPacchettiBox");

    if (reportBox && !reportBox.classList.contains("hidden")) {
      renderReportPacchetti();
    }

    renderCalendario();
    mostraDettaglioLezione(idLezione, dettaglioLezioneBoxAttivo);

    setStatus("Prenotazione eliminata correttamente ✅", "ok");

  } catch (error) {
    console.error("Errore eliminaPrenotazioneDaLezione:", error);
    setStatus("Errore eliminazione prenotazione", "err");
  }
}


function mostraSchedaCliente(idCliente) {
  const box = document.getElementById("outputClienti");
  if (!box) return;

  const cliente = clientiData.find(c =>
    String(c.ID_Cliente) === String(idCliente)
  );

  if (!cliente) return;

  animateView(box, `
    <div class="app-toolbar">
      <button class="app-back-btn" onclick="chiudiDettaglioCliente()">
        ← Clienti
      </button>
    </div>

    <div class="view-content">
      <div style="padding: 12px 12px 90px 12px;">

        <div class="card-ios">
          <div class="card-title">
            ${safe(cliente.Nome)} ${safe(cliente.Cognome)}
          </div>

          <div class="card-sub">📞 ${safe(cliente.Telefono || "-")}</div>
          <div class="card-sub">📧 ${safe(cliente.Email || "-")}</div>
          <div class="card-sub">🏠 ${safe(cliente.Indirizzo || "-")}</div>
          <div class="card-sub">📍 ${safe(cliente["Cittá"] || "-")}</div>
          <div class="card-sub">📮 ${safe(cliente.CAP || "-")}</div>
          <div class="card-sub">🧾 ${safe(cliente.Codice_Fiscale || "-")}</div>

          <div class="card-actions">
            <button onclick="apriIncassoCliente('${escapeQuote(cliente.ID_Cliente)}')">
              💳 Incasso
            </button>

            <button onclick="mostraModificaClienteInline('${escapeQuote(cliente.ID_Cliente)}')">
              ✏️ Modifica
            </button>

            <button onclick="mostraPacchettiCliente('${escapeQuote(cliente.ID_Cliente)}')">
              🎟️ Pacchetti
            </button>

            <button onclick="mostraPrenotazioniCliente('${escapeQuote(cliente.ID_Cliente)}')">
              📅 Prenotazioni
            </button>

            <button onclick="inviaWhatsAppCliente('${escapeQuote(cliente.ID_Cliente)}')">
              📲 WhatsApp
            </button>

            <button onclick="eliminaCliente('${escapeQuote(cliente.ID_Cliente)}')">
              🗑️ Elimina
            </button>
          </div>
        </div>

      </div>
    </div>
  `);
}


function getPacchettiDaPagareCliente(idCliente) {
  return pacchettiData
    .filter(p =>
      String(p.ID_Cliente) === String(idCliente) &&
      !isPacchettoChiuso(p) &&
      Number(p.Da_Pagare || 0) > 0
    )
    .sort((a, b) => {
      const dataA = String(a.Valido_Da || "");
      const dataB = String(b.Valido_Da || "");
      return dataA.localeCompare(dataB);
    });
}

function apriIncassoCliente(idCliente) {
  console.log("💳 Apri incasso cliente:", idCliente);

  const box = document.getElementById("outputClienti");
  if (!box) return;

  const cliente = clientiData.find(c =>
    String(c.ID_Cliente) === String(idCliente)
  );

  if (!cliente) {
    setStatus("Cliente non trovato per incasso", "err");
    return;
  }

  const clienteNome = `${cliente.Nome || ""} ${cliente.Cognome || ""}`.trim();
  const pacchettiDaPagare = getPacchettiDaPagareCliente(idCliente);

  const totaleDaPagare = pacchettiDaPagare.reduce((sum, p) => {
    return sum + Number(p.Da_Pagare || 0);
  }, 0);

  const optionsPacchetti = pacchettiDaPagare.length
    ? `
      <option value="__AUTO__">
        Auto - scala dai pacchetti aperti più vecchi
      </option>
      ${pacchettiDaPagare.map(p => `
        <option value="${escapeAttr(p.ID_Pacchetto)}">
          ${safe(p.ID_Pacchetto)} - ${safe(p.Tipo_Pacchetto)} - Da pagare: ${formatEuro(Number(p.Da_Pagare || 0))}
        </option>
      `).join("")}
    `
    : `
      <option value="__NUOVO__">
        Nessun importo aperto - usa incasso come acconto nuovo pacchetto
      </option>
    `;

  animateView(box, `
    <div class="app-toolbar">
      <button class="app-back-btn" onclick="mostraSchedaCliente('${escapeQuote(idCliente)}')">
        ← Cliente
      </button>
    </div>

    <div class="view-content">
      <div style="padding: 12px 12px 90px 12px;">

        <div class="card-ios">
          <div class="card-title">
            💳 Registra Incasso
          </div>

          <div class="card-sub">
            <strong>Cliente:</strong> ${safe(clienteNome)}
          </div>

          <div class="card-sub">
            <strong>ID Cliente:</strong> ${safe(idCliente)}
          </div>

          <div class="card-sub">
            <strong>Totale Da Pagare aperto:</strong> ${formatEuro(totaleDaPagare)}
          </div>
        </div>

        <div class="card-ios">
          <div class="card-title">
            Dati pagamento
          </div>

          <div class="form-row">
            <label class="field-block">
              <span class="field-label">Importo incassato</span>
              <input
                id="incasso_importo"
                type="number"
                step="0.01"
                min="0"
                placeholder="Importo"
                oninput="aggiornaAnteprimaIncassoCliente('${escapeQuote(idCliente)}')"
              >
            </label>

            <label class="field-block">
              <span class="field-label">Pacchetto / Allocazione</span>
              <select
                id="incasso_pacchetto"
                onchange="aggiornaAnteprimaIncassoCliente('${escapeQuote(idCliente)}')"
              >
                ${optionsPacchetti}
              </select>
            </label>
          </div>

          <div class="form-row">
            <label class="field-block">
              <span class="field-label">Metodo pagamento</span>
              <select id="incasso_metodo">
                <option value="">Metodo</option>
                <option value="Contanti">Contanti</option>
                <option value="Carta">Carta</option>
                <option value="Bonifico">Bonifico</option>
              </select>
            </label>

            <label class="field-block">
              <span class="field-label">Nota</span>
              <input id="incasso_note" placeholder="Nota opzionale">
            </label>
          </div>

          <div id="incassoAnteprimaBox" class="muted">
            Inserisci un importo per vedere l’anteprima.
          </div>

          <div class="card-actions">
            <button onclick="registraIncassoCliente('${escapeQuote(idCliente)}')">
              ✅ Registra incasso
            </button>

            <button onclick="mostraSchedaCliente('${escapeQuote(idCliente)}')">
              Annulla
            </button>
          </div>
        </div>

      </div>
    </div>
  `);

  setTimeout(() => {
    aggiornaAnteprimaIncassoCliente(idCliente);
  }, 80);
}

function aggiornaAnteprimaIncassoCliente(idCliente) {
  const out = document.getElementById("incassoAnteprimaBox");
  if (!out) return;

  const importo = Number(document.getElementById("incasso_importo")?.value || 0);
  const scelta = document.getElementById("incasso_pacchetto")?.value || "";

  const pacchettiDaPagare = getPacchettiDaPagareCliente(idCliente);
  const totaleDaPagare = pacchettiDaPagare.reduce((sum, p) => {
    return sum + Number(p.Da_Pagare || 0);
  }, 0);

  if (!importo || importo <= 0) {
    out.innerHTML = "Inserisci un importo per vedere l’anteprima.";
    return;
  }

  if (!pacchettiDaPagare.length || scelta === "__NUOVO__") {
    out.innerHTML = `
      <div class="report-warning">
        Nessun Da Pagare aperto. L'importo ${formatEuro(importo)}
        verrà proposto come acconto su un nuovo pacchetto.
      </div>
    `;
    return;
  }

  if (importo <= totaleDaPagare) {
    out.innerHTML = `
      <div class="muted">
        L'importo ${formatEuro(importo)} verrà scalato dai pacchetti aperti.
        Totale Da Pagare attuale: ${formatEuro(totaleDaPagare)}.
      </div>
    `;
    return;
  }

  const eccedenza = importo - totaleDaPagare;

  out.innerHTML = `
    <div class="report-warning">
      L'importo supera il Da Pagare aperto.
      Verranno chiusi i saldi aperti per ${formatEuro(totaleDaPagare)}
      e l'eccedenza ${formatEuro(eccedenza)}
      verrà proposta come acconto su un nuovo pacchetto.
    </div>
  `;
}

async function registraIncassoCliente(idCliente) {
  console.log("💳 Registra incasso cliente:", idCliente);

  const importo = Number(document.getElementById("incasso_importo")?.value || 0);
  if (!Number.isFinite(importo) || importo <= 0 || importo > 10000) {
  setStatus("Importo non valido", "err");
  return;
  }
  const sceltaPacchetto = document.getElementById("incasso_pacchetto")?.value || "";
  const metodo = document.getElementById("incasso_metodo")?.value || "";
  const note = document.getElementById("incasso_note")?.value.trim() || "";

  if (!importo || importo <= 0) {
    alert("Inserisci un importo valido");
    return;
  }

  let pacchettiDaPagare = getPacchettiDaPagareCliente(idCliente);

  // =====================================================
  // CASO A — NESSUN DA_PAGARE APERTO
  // =====================================================
  if (!pacchettiDaPagare.length || sceltaPacchetto === "__NUOVO__") {
    const confermaNuovo = confirm(
      "Non ci sono importi Da Pagare aperti per questo cliente.\n\nVuoi usare questo incasso come acconto per un nuovo pacchetto?"
    );

    if (!confermaNuovo) {
      setStatus("Incasso annullato", "err");
      return;
    }

    // ✅ Registro tutto come acconto nuovo pacchetto in Conti Studio
    const contiResult = await registraMovimentiContiDaIncasso(
      idCliente,
      metodo,
      note,
      [],
      importo
    );

    if (!contiResult.ok) {
      alert("Errore registrazione Conti Studio: " + contiResult.error.message);
      return;
    }

    await loadConti();

    preparaNuovoPacchettoConAcconto(
      idCliente,
      importo,
      contiResult.accontoMovimentoId
    );
    return;
  }

  let residuoIncasso = importo;

  // ✅ Se hai scelto un pacchetto specifico, lo metto per primo.
  if (sceltaPacchetto && sceltaPacchetto !== "__AUTO__") {
    pacchettiDaPagare = pacchettiDaPagare.sort((a, b) => {
      if (String(a.ID_Pacchetto) === String(sceltaPacchetto)) return -1;
      if (String(b.ID_Pacchetto) === String(sceltaPacchetto)) return 1;
      return String(a.Valido_Da || "").localeCompare(String(b.Valido_Da || ""));
    });
  }

  const allocazioniConti = [];

  // =====================================================
  // CASO B — SCALA IMPORTO DAI PACCHETTI APERTI
  // =====================================================
  for (const p of pacchettiDaPagare) {
    if (residuoIncasso <= 0) break;

    const daPagareAttuale = Number(p.Da_Pagare || 0);
    if (daPagareAttuale <= 0) continue;

    const quotaAllocata = Math.min(residuoIncasso, daPagareAttuale);
    const nuovoDaPagare = Math.max(0, daPagareAttuale - quotaAllocata);

    const payloadUpdate = {
      Da_Pagare: nuovoDaPagare,
      Flag_Pagato: nuovoDaPagare <= 0 ? "Si" : "No"
    };

try {
  await safeUpdate(
    "pacchetti",
    payloadUpdate,
    { ID_Pacchetto: p.ID_Pacchetto }
  );
} catch (error) {
  console.error("Errore aggiornamento Da_Pagare pacchetto:", error);
  alert("Errore aggiornamento pacchetto");
  return;
}

    allocazioniConti.push({
      idPacchetto: p.ID_Pacchetto,
      tipoPacchetto: p.Tipo_Pacchetto,
      flagC: p.Flag_C || "No",
      quotaAllocata: quotaAllocata,
      vecchioDaPagare: daPagareAttuale,
      nuovoDaPagare: nuovoDaPagare
    });

    residuoIncasso -= quotaAllocata;
  }

  // =====================================================
  // CASO C — REGISTRA MOVIMENTI CONTI STUDIO
  // =====================================================
  const contiResult = await registraMovimentiContiDaIncasso(
    idCliente,
    metodo,
    note,
    allocazioniConti,
    residuoIncasso
  );

  if (!contiResult.ok) {
    alert("Errore registrazione Conti Studio: " + contiResult.error.message);
    return;
  }

  await loadPacchetti();
  await loadPrenotazioni();
  await loadConti();

  console.log("✅ Allocazioni incasso:", allocazioniConti);
  console.log("💰 Residuo incasso:", residuoIncasso);

  // =====================================================
  // CASO D — INCASSO SUPERIORE AI DA_PAGARE APERTI
  // =====================================================
  if (residuoIncasso > 0.009) {
    const confermaEccedenza = confirm(
      "Incasso registrato sui pacchetti aperti.\n\nRimane un'eccedenza di " +
      formatEuro(residuoIncasso) +
      ".\n\nVuoi aprire un nuovo pacchetto e usare l'eccedenza come acconto?"
    );

    if (confermaEccedenza) {
      preparaNuovoPacchettoConAcconto(
        idCliente,
        residuoIncasso,
        contiResult.accontoMovimentoId
      );
      return;
    }
  }

  setStatus("Incasso registrato e collegato a Conti Studio ✅", "ok");
  alert("✅ Incasso registrato e collegato a Conti Studio");

  mostraPacchettiCliente(idCliente);
}

function preparaNuovoPacchettoConAcconto(idCliente, acconto, accontoMovimentoId = null) {
  console.log("➕ Nuovo pacchetto con acconto:", {
    idCliente,
    acconto,
    accontoMovimentoId
  });

  window.pendingAccontoNuovoPacchetto = {
    idCliente: idCliente,
    acconto: Number(acconto || 0),
    accontoMovimentoId: accontoMovimentoId
  };

  vaiTab("pacchetti");

  setTimeout(() => {
    const box = document.getElementById("nuovoPacchettoBox");

    if (box && box.classList.contains("hidden")) {
      toggleNuovoPacchetto();
    } else {
      renderSelectPacchettoClienti();
      renderSelectTipiPacchetto();
      preparaNuovoPacchetto();
    }

    const clienteSelect = document.getElementById("pac_cliente");
    if (clienteSelect) {
      clienteSelect.value = idCliente;
    }

    const flagPagato = document.getElementById("pac_flag_pagato");
    if (flagPagato) {
      flagPagato.value = "No";
    }

    daPagareManuale = true;

    applicaAccontoNuovoPacchetto();

    if (box) {
      box.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, 250);
}

function applicaAccontoNuovoPacchetto() {
  const pending = window.pendingAccontoNuovoPacchetto;
  if (!pending || !pending.idCliente || !pending.acconto) return;

  const box = document.getElementById("nuovoPacchettoBox");
  if (!box) return;

  let info = document.getElementById("accontoNuovoPacchettoInfo");

  if (!info) {
    info = document.createElement("div");
    info.id = "accontoNuovoPacchettoInfo";
    info.className = "report-warning";
    info.style.margin = "10px 0";
    box.insertBefore(info, box.firstChild.nextSibling);
  }

  const prezzoInput = document.getElementById("pac_prezzo");
  const daPagareInput = document.getElementById("pac_da_pagare");
  const flagPagatoInput = document.getElementById("pac_flag_pagato");

  const acconto = Number(pending.acconto || 0);
  const prezzo = Number(prezzoInput?.value || 0);

  if (flagPagatoInput) {
    flagPagatoInput.value = "No";
  }

  if (daPagareInput) {
    const nuovoDaPagare = prezzo > 0
      ? Math.max(0, prezzo - acconto)
      : 0;

    daPagareInput.readOnly = false;
    daPagareInput.required = true;
    daPagareInput.value = String(nuovoDaPagare.toFixed(2));

    if (flagPagatoInput && prezzo > 0 && nuovoDaPagare <= 0) {
      flagPagatoInput.value = "Si";
      daPagareInput.readOnly = true;
    }
  }

  info.innerHTML = `
    💳 Acconto da incasso precedente: <strong>${formatEuro(acconto)}</strong><br>
    Se inserisci il Prezzo del nuovo pacchetto, il campo <strong>Da Pagare</strong>
    viene calcolato come <strong>Prezzo - Acconto</strong>.
  `;

  if (prezzoInput && !prezzoInput.dataset.accontoListener) {
    prezzoInput.dataset.accontoListener = "true";

    prezzoInput.addEventListener("input", () => {
      aggiornaAnteprimaPacchetto();
      applicaAccontoNuovoPacchetto();
    });
  }
}


function mostraPrenotazioniCliente(idCliente) {
  const box = document.getElementById("outputClienti");
  if (!box) return;

  const cliente = clientiData.find(c =>
    String(c.ID_Cliente) === String(idCliente)
  );

  if (!cliente) {
    animateView(box, `
      <div class="app-toolbar">
        <button class="app-back-btn" onclick="chiudiDettaglioCliente()">
          ← Clienti
        </button>
      </div>

      <div class="view-content">
        <div class="card-ios">
          <div class="card-title">Cliente non trovato</div>
        </div>
      </div>
    `);
    return;
  }

  const clienteNome = `${cliente.Nome || ""} ${cliente.Cognome || ""}`.trim();

  const prenotazioni = prenotazioniData
    .filter(p => String(p.ID_Cliente) === String(idCliente))
    .sort((a, b) => {
      return String(b.Data_Lezione || "").localeCompare(String(a.Data_Lezione || ""));
    });

  const cardsHtml = prenotazioni.length
    ? prenotazioni.map(p => {

        const lezione = lezioniData.find(l =>
          String(l.ID_Lezione) === String(p.ID_Lezione)
        );

        const pacchetto = pacchettiData.find(pc =>
          String(pc.ID_Pacchetto) === String(p.ID_Pacchetto)
        );

        return `
          <div class="card-ios">
            <div class="card-title">
              ${safe(clienteNome)}
            </div>

            <div class="card-sub">
              📅 Lezione: ${lezione ? safe(lezione.Data) : "-"}
            </div>

            <div class="card-sub">
              ⏰ Ora: ${lezione ? safe(formatOraHHMM(lezione.Ora)) : "-"}
            </div>

            <div class="card-sub">
              🧘 Tipologia: ${lezione ? safe(lezione.Tipologia) : "-"}
            </div>

            <div class="card-sub">
              🎟️ Pacchetto: ${safe(p.ID_Pacchetto || "-")}
              ${pacchetto ? ` — ${safe(pacchetto.Tipo_Pacchetto || "")}` : ""}
            </div>

            <div class="card-actions">
              <button onclick="eliminaPrenotazione('${escapeQuote(p.ID_Prenotazione)}')">
                🗑️ Elimina
              </button>
            </div>
          </div>
        `;
      }).join("")
    : `
      <div class="card-ios">
        <div class="card-sub">
          Nessuna prenotazione trovata per questo cliente.
        </div>
      </div>
    `;

  animateView(box, `
    <div class="app-toolbar">
      <button class="app-back-btn" onclick="chiudiDettaglioCliente()">
        ← Clienti
      </button>
    </div>

    <div class="view-content">

      <div style="padding: 12px 12px 90px 12px;">

        <div class="card-ios">
          <div class="card-title">
            📅 Prenotazioni Cliente
          </div>

          <div class="card-sub">
            <strong>Cliente:</strong> ${safe(clienteNome)}
          </div>

          <div class="card-sub">
            <strong>ID Cliente:</strong> ${safe(cliente.ID_Cliente)}
          </div>

          <div class="card-sub">
            <strong>Totale prenotazioni:</strong> ${prenotazioni.length}
          </div>
        </div>

        ${cardsHtml}

      </div>

    </div>
  `);
}

function mostraPacchettiCliente(idCliente) {
  const box = document.getElementById("outputClienti");
  if (!box) return;

  const cliente = clientiData.find(c =>
    String(c.ID_Cliente) === String(idCliente)
  );

  if (!cliente) {
    animateView(box, `
      <div class="app-toolbar">
        <button class="app-back-btn" onclick="chiudiDettaglioCliente()">
          ← Clienti
        </button>
      </div>

      <div class="view-content">
        <div class="card-ios">
          <div class="card-title">Cliente non trovato</div>
        </div>
      </div>
    `);
    return;
  }

  const clienteNome = `${cliente.Nome || ""} ${cliente.Cognome || ""}`.trim();

  const pacchetti = pacchettiData
    .filter(p => String(p.ID_Cliente) === String(idCliente))
    .sort((a, b) => {
      return String(b.Valido_Da || "").localeCompare(String(a.Valido_Da || ""));
    });

  const cardsHtml = pacchetti.length
    ? pacchetti.map(p => {
        const lezioniTotali = Number(p.Lezioni_Totali || 0);
        const lezioniUsate = contaPrenotazioniPacchetto(p.ID_Pacchetto);
        const lezioniRimanenti = lezioniTotali - lezioniUsate;
        const daPagare = Number(p.Da_Pagare || 0);

        const alertDaPagare = !isPacchettoChiuso(p) && daPagare > 0;
        const alertInScadenza = !isPacchettoChiuso(p) && lezioniRimanenti <= 2;

        return `
          <div class="card-ios">
            <div class="card-title">
              ${safe(clienteNome)}
            </div>

            <div class="card-sub">
              🎟️ Tipo Pacchetto: ${safe(p.Tipo_Pacchetto)}
            </div>

            <div class="card-sub">
              💰 Prezzo: ${safe(p.Prezzo)}
            </div>

            <div class="card-sub">
              💸 Da Pagare: ${safe(p.Da_Pagare)}
            </div>

            <div class="card-sub">
              📊 Lezioni Totali: ${safe(lezioniTotali)}
            </div>

            <div class="card-sub">
              ✅ Lezioni Usate: ${safe(lezioniUsate)}
            </div>

            <div class="card-sub">
              ⚖️ Lezioni Rimanenti: ${safe(lezioniRimanenti)}
            </div>

            <div class="card-sub">
              📅 Validità Da: ${safe(p.Valido_Da)}
            </div>

            <div class="card-sub">
              📅 Validità A: ${safe(p.Valido_A)}
            </div>

            <div class="card-sub">
              📌 Stato: ${safe(p.Stato || "Attivo")}
            </div>

            ${
              alertDaPagare
                ? `<div class="report-warning">⚠️ Da pagare: ${safe(daPagare)}</div>`
                : ""
            }

            ${
              alertInScadenza
                ? `<div class="report-warning">⚠️ In scadenza: ${safe(lezioniRimanenti)} lezioni rimanenti</div>`
                : ""
            }

            <div class="card-actions">
              <button onclick="apriDettaglioPacchettoDaCliente('${escapeQuote(p.ID_Pacchetto)}')">
                🔎 Dettaglio
              </button>
            </div>
          </div>
        `;
      }).join("")
    : `
      <div class="card-ios">
        <div class="card-title">Nessun pacchetto</div>
        <div class="card-sub">
          Non ci sono pacchetti registrati per questo cliente.
        </div>
      </div>
    `;

  animateView(box, `
    <div class="app-toolbar">
      <button class="app-back-btn" onclick="chiudiDettaglioCliente()">
        ← Clienti
      </button>
    </div>

    <div class="view-content">

      <div style="padding: 12px 12px 90px 12px;">

        <div class="card-ios">
          <div class="card-title">
            🎟️ Pacchetti Cliente
          </div>

          <div class="card-sub">
            <strong>Cliente:</strong> ${safe(clienteNome)}
          </div>

          <div class="card-sub">
            <strong>ID Cliente:</strong> ${safe(cliente.ID_Cliente)}
          </div>

          <div class="card-sub">
            <strong>Totale pacchetti:</strong> ${pacchetti.length}
          </div>
        </div>

        ${cardsHtml}

      </div>

    </div>
  `);
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

  try {
    await safeUpdate(
      "clienti",
      payload,
      { ID_Cliente: idCliente }
    );

    await loadClienti();
    await loadPrenotazioni();

    setStatus("Cliente modificato correttamente ✅", "ok");

    setTimeout(() => {
      mostraSchedaCliente(idCliente);
    }, 100);

  } catch (error) {
    console.error("Errore salvaModificaClienteInline:", error);
    setStatus("Errore modifica cliente", "err");
  }
}


/* ===================== HOME ===================== */
function renderHome() {
  const mainContainer = document.getElementById("status")?.parentElement;
  if (!mainContainer) return;

  const oggi = getTodayString();

  const lezioniOggi = lezioniData
    .filter(l => String(l.Data) === String(oggi))
    .sort((a, b) => String(a.Ora || "").localeCompare(String(b.Ora || "")));

  const statsOggi = getAgendaStatsGiorno(lezioniOggi);

  const reportDaPagare = getPacchettiReportDaPagare();
  const reportInScadenza = getPacchettiReportInScadenza();
  const fattureMancanti = getPacchettiReportFattureMancanti();

  const prossimaLezione = lezioniOggi.length
    ? lezioniOggi.find(l => {
        const ora = formatOraHHMM(l.Ora);
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        return ora >= `${hh}:${mm}`;
      }) || lezioniOggi[0]
    : null;

  const prossimaLezionePrenotati = prossimaLezione
    ? prenotazioniData.filter(p =>
        String(p.ID_Lezione) === String(prossimaLezione.ID_Lezione)
      ).length
    : 0;

  const prossimaLezioneMax = prossimaLezione
    ? Number(prossimaLezione.Max_Partecipanti || 0)
    : 0;

  const homeHtml = `
    <div id="homeSection" class="app-view">

      <div class="home-hero">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="icon-192.png" style="width:42px; height:42px; border-radius:12px;">
          <div class="home-title">Pilates Therapy</div>
        </div>

        <div class="home-subtitle">
          Hub operativo dello studio: agenda, clienti, prenotazioni, pacchetti e report in un solo punto.
        </div>
      </div>

      <div class="home-kpi-grid">

        <div class="home-kpi-card">
          <div class="home-kpi-label">Oggi</div>
          <div class="home-kpi-value">${statsOggi.totaleLezioni}</div>
          <div class="home-kpi-note">lezioni programmate</div>
        </div>

        <div class="home-kpi-card">
          <div class="home-kpi-label">Prenotazioni oggi</div>
          <div class="home-kpi-value">${statsOggi.totalePrenotati}/${statsOggi.totalePosti}</div>
          <div class="home-kpi-note">${statsOggi.postiLiberi} posti liberi</div>
        </div>

        <div class="home-kpi-card">
          <div class="home-kpi-label">Clienti</div>
          <div class="home-kpi-value">${clientiData.length}</div>
          <div class="home-kpi-note">anagrafiche attive</div>
        </div>

        <div class="home-kpi-card">
          <div class="home-kpi-label">Alert pacchetti</div>
          <div class="home-kpi-value">${reportDaPagare.length + reportInScadenza.length}</div>
          <div class="home-kpi-note">da controllare</div>
        </div>

      </div>

      <div class="home-section-title">Azioni rapide</div>

      <div class="home-action-grid">

        <button class="home-action-card primary" onclick="vaiTab('calendario')">
          <div class="home-action-icon">📅</div>
          <div>
            <div class="home-action-title">Agenda</div>
            <div class="home-action-sub">Apri la giornata e gestisci le lezioni.</div>
          </div>
        </button>

        <button class="home-action-card blue-soft" onclick="vaiTab('clienti')">
          <div class="home-action-icon">🧑‍🤝‍🧑</div>
          <div>
            <div class="home-action-title">Clienti</div>
            <div class="home-action-sub">Cerca, modifica e apri schede cliente.</div>
          </div>
        </button>

        <button class="home-action-card green" onclick="apriNuovaPrenotazioneDaHome()">
          <div class="home-action-icon">📝</div>
          <div>
            <div class="home-action-title">Prenotazione</div>
            <div class="home-action-sub">Crea una nuova prenotazione manuale.</div>
          </div>
        </button>

        
        <button class="home-action-card purple" onclick="vaiTab('conti')">
          <div class="home-action-icon">💼</div>
          <div>
            <div class="home-action-title">Conti Studio</div>
            <div class="home-action-sub">Apri la sezione finanziaria dello studio.</div>
          </div>
        </button>


        <button class="home-action-card" onclick="apriNuovoPacchettoDaHome()">
          <div class="home-action-icon">🎟️</div>
          <div>
            <div class="home-action-title">Pacchetto</div>
            <div class="home-action-sub">Registra pagamento, scadenza e saldo.</div>
          </div>
        </button>

        <button class="home-action-card warning" onclick="vaiTab('reportPacchetti')">
          <div class="home-action-icon">🚨</div>
          <div>
            <div class="home-action-title">Alert</div>
            <div class="home-action-sub">Pagamenti, scadenze e anomalie da gestire.</div>

          </div>
        </button>

      </div>

      <div class="home-section-title">Prossima lezione</div>

      <div class="home-wide-card">
        ${
          prossimaLezione
            ? `
              <div class="home-wide-title">
                ${safe(formatOraHHMM(prossimaLezione.Ora))} · ${safe(prossimaLezione.Tipologia)}
              </div>
              <div class="home-wide-line">👤 Istruttore: ${safe(prossimaLezione.Istruttore)}</div>
              <div class="home-wide-line">🧑‍🤝‍🧑 Prenotati: ${prossimaLezionePrenotati}/${prossimaLezioneMax}</div>
              <div class="home-wide-line">📅 Data: ${safe(formatDataEstesaIt(prossimaLezione.Data))}</div>
              <div class="home-quick-row">
                <button onclick="vaiTab('calendario')">Apri Agenda</button>
                <button onclick="apriDettaglioLezioneDaHome('${escapeQuote(prossimaLezione.ID_Lezione)}')">
                Dettaglio
                </button>

              </div>
            `
            : `
              <div class="home-wide-title">Nessuna lezione oggi</div>
              <div class="home-wide-line">
                Puoi creare subito una nuova lezione dalla Home o dall’Agenda.
              </div>
              <div class="home-quick-row">
                <button onclick="apriNuovaLezioneDaHome()">➕ Nuova lezione</button>
                <button onclick="vaiTab('calendario')">Apri Agenda</button>
              </div>
            `
        }
      </div>

      <div class="home-section-title">Alert operativi</div>

      <div class="home-wide-card">
        <div class="home-wide-title">Pacchetti</div>
        <div class="home-wide-line">💰 Da pagare: ${reportDaPagare.length}</div>
        <div class="home-wide-line">⚠️ In scadenza: ${reportInScadenza.length}</div>
        <div class="home-wide-line">🧾 Fatture mancanti: ${fattureMancanti.length}</div>
        <div class="home-quick-row">
          <button onclick="vaiTab('reportPacchetti')">Apri Alert</button>
        </div>

      </div>

      <div class="home-bottom-space"></div>

    </div>
  `;

  document.querySelectorAll(".section").forEach(sec => {
    sec.classList.remove("active-section");
    sec.classList.add("hidden");
  });

  const oldHome = document.getElementById("homeSection");
  if (oldHome) oldHome.remove();

  mainContainer.insertAdjacentHTML("beforeend", homeHtml);

  document.querySelectorAll(".footer-tab").forEach(btn => {
    btn.classList.remove("active");
  });

  const tabHome = document.getElementById("tabHome");
  if (tabHome) tabHome.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function chiudiHomeSeAperta() {
  const oldHome = document.getElementById("homeSection");
  if (oldHome) oldHome.remove();
}

function apriNuovaPrenotazioneDaHome() {
  vaiTab("prenotazioni");

  setTimeout(() => {
    const box = document.getElementById("nuovaPrenotazioneBox");

    if (box && box.classList.contains("hidden")) {
      box.classList.remove("hidden");
    }

    applicaSmartDefaultsPrenotazione();

    const target = document.getElementById("nuovaPrenotazioneBox");
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, 180);
}

function apriNuovaLezioneDaHome() {
  vaiTab("calendario");

  setTimeout(() => {
    const box = document.getElementById("nuovaLezioneAgendaBox");

    if (box && box.classList.contains("hidden")) {
      toggleNuovaLezioneAgenda();

    } else if (typeof preparaNuovaLezioneAgenda === "function") {
      preparaNuovaLezioneAgenda();
    }


    const target = document.getElementById("nuovaLezioneAgendaBox");
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, 160);
}

function apriNuovoPacchettoDaHome() {
  vaiTab("pacchetti");

  setTimeout(() => {
    const box = document.getElementById("nuovoPacchettoBox");
    if (box && box.classList.contains("hidden")) {
      toggleNuovoPacchetto();
    }

    const section = document.getElementById("pacchettiSection");
    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, 160);
}

async function apriDettaglioPacchettoDaCliente(idPacchetto) {
  console.log("➡️ Apri dettaglio pacchetto da cliente:", idPacchetto);

  if (!idPacchetto) {
    console.warn("❌ ID pacchetto mancante");
    setStatus("ID pacchetto mancante", "err");
    return;
  }

  try {
    // ✅ 1. Carico/aggiorno i pacchetti prima di salvare il contesto
    await loadPacchetti();

    const pacchettoOrigine = pacchettiData.find(p =>
      String(p.ID_Pacchetto) === String(idPacchetto)
    );

    if (!pacchettoOrigine) {
      console.warn("❌ Pacchetto non trovato prima della navigazione:", idPacchetto);
      setStatus("Pacchetto non trovato", "err");
      alert("Pacchetto non trovato");
      return;
    }

    // ✅ 2. Memorizzo origine + cliente + pacchetto
    // Così il tasto Indietro torna alla stessa vista del cliente
    window.lastPacchettoNavigation = {
      origine: "clienti",
      idCliente: pacchettoOrigine.ID_Cliente,
      idPacchetto: pacchettoOrigine.ID_Pacchetto
    };

    console.log("🧭 Contesto navigazione pacchetto:", window.lastPacchettoNavigation);

    // ✅ 3. Vai alla tab pacchetti
    vaiTab("pacchetti");

    // ✅ 4. Ricarico i pacchetti dopo il cambio tab
    await loadPacchetti();

    // ✅ 5. Forza apertura dettaglio DOPO render lista
    setTimeout(() => {
      console.log("➡️ Apertura dettaglio forzata:", idPacchetto);

      mostraDettaglioPacchetto(idPacchetto, "clienti");

      const container = document.getElementById("outputPacchetti");
      if (container) {
        container.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }, 220);

  } catch (err) {
    console.error("❌ Errore apertura dettaglio:", err);
    setStatus("Errore apertura dettaglio pacchetto", "err");
    alert("Errore apertura dettaglio");
  }
}



function apriDettaglioLezioneDaHome(idLezione) {
  if (!idLezione) return;

  // 1. Vai in Agenda
  vaiTab("calendario");

  // 2. Aspetta che la UI sia ready
  setTimeout(() => {
    // 3. Apri dettaglio nella box Agenda
    mostraDettaglioLezione(idLezione, "dettaglioCalendarioLezioneBox");

    // 4. Scroll verso il dettaglio
    const box = document.getElementById("dettaglioCalendarioLezioneBox");

    if (box) {
      setTimeout(() => {
        box.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 120);
    }

  }, 180);
}



/* ===================== FOOTER MENU APP ===================== */
function vaiTab(tab) {
  const dashboardSection = document.getElementById("dashboardSection");
  const calendarioSection = document.getElementById("calendarioSection");
  const clientiSection = document.getElementById("clientiSection");
  const contiSection = document.getElementById("contiSection");
  const lezioniSection = document.getElementById("lezioniSection");
  const prenotazioniSection = document.getElementById("prenotazioniSection");
  const pacchettiSection = document.getElementById("pacchettiSection");

  const tabHome = document.getElementById("tabHome");
  const tabDashboard = document.getElementById("tabDashboard");
  const tabCalendario = document.getElementById("tabCalendario");
  const tabClienti = document.getElementById("tabClienti");
  const tabLezioni = document.getElementById("tabLezioni");
  const tabPrenotazioni = document.getElementById("tabPrenotazioni");
  const tabPacchetti = document.getElementById("tabPacchetti");
  const tabReportPacchetti = document.getElementById("tabReportPacchetti");

  const dashboardWrapper = dashboardSection?.parentElement;
  const calendarioWrapper = calendarioSection?.parentElement;
  const clientiWrapper = clientiSection?.parentElement;
  const contiWrapper = contiSection?.parentElement;
  const lezioniWrapper = lezioniSection?.parentElement;
  const prenotazioniWrapper = prenotazioniSection?.parentElement;
  const pacchettiWrapper = pacchettiSection?.parentElement;

  const wrappers = [
    dashboardWrapper,
    calendarioWrapper,
    clientiWrapper,
    contiWrapper,
    lezioniWrapper,
    prenotazioniWrapper,
    pacchettiWrapper
  ];

  wrappers.forEach(wrapper => {
    if (wrapper) wrapper.classList.remove("active-section");
  });

  [
    tabHome,
    tabDashboard,
    tabCalendario,
    tabClienti,
    tabLezioni,
    tabPrenotazioni,
    tabPacchetti,
    tabReportPacchetti
  ].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

  if (tab !== "home") {
    chiudiHomeSeAperta();
  }

  if (dashboardSection) dashboardSection.classList.add("hidden");
  if (calendarioSection) calendarioSection.classList.add("hidden");
  if (clientiSection) clientiSection.classList.add("hidden");
  if (contiSection) contiSection.classList.add("hidden");
  if (lezioniSection) lezioniSection.classList.add("hidden");
  if (prenotazioniSection) prenotazioniSection.classList.add("hidden");
  if (pacchettiSection) pacchettiSection.classList.add("hidden");

  const dettaglioLezioneBox = document.getElementById("dettaglioLezioneBox");
  if (dettaglioLezioneBox) {
    dettaglioLezioneBox.innerHTML = "";
    dettaglioLezioneBox.classList.add("hidden");
  }

  const dettaglioCalendarioLezioneBox = document.getElementById("dettaglioCalendarioLezioneBox");
  if (dettaglioCalendarioLezioneBox && tab !== "calendario") {
    dettaglioCalendarioLezioneBox.innerHTML = "";
    dettaglioCalendarioLezioneBox.classList.add("hidden");
  }

  const outputStoricoCliente = document.getElementById("outputStoricoCliente");
  if (outputStoricoCliente) {
    outputStoricoCliente.innerHTML = `
      <p class="muted">Clicca sul nome di un cliente nella tabella prenotazioni per vedere il suo storico.</p>
    `;
  }

  if (tab === "home") {
    renderHome();
    return;
  }

  if (tab === "conti") {
  if (contiWrapper) contiWrapper.classList.add("active-section");
  if (contiSection) contiSection.classList.remove("hidden");
  scrollToSection("contiSection");
  loadConti();
  return;
}

  if (tab === "dashboard") {
    if (dashboardWrapper) dashboardWrapper.classList.add("active-section");
    if (dashboardSection) dashboardSection.classList.remove("hidden");
    if (tabDashboard) tabDashboard.classList.add("active");

    calcolaDashboardMensile();
    calcolaDashboardSettimanale();

    scrollToSection("dashboardSection");
    return;
  }

  if (tab === "calendario") {
    if (calendarioWrapper) calendarioWrapper.classList.add("active-section");
    if (calendarioSection) calendarioSection.classList.remove("hidden");
    if (tabCalendario) tabCalendario.classList.add("active");

    renderCalendario();

    scrollToSection("calendarioSection");
    return;
  }

  if (tab === "clienti") {
    if (clientiWrapper) clientiWrapper.classList.add("active-section");
    if (clientiSection) clientiSection.classList.remove("hidden");
    if (tabClienti) tabClienti.classList.add("active");

    renderClienti();

    scrollToSection("clientiSection");
    return;
  }

  if (tab === "lezioni") {
    if (lezioniWrapper) lezioniWrapper.classList.add("active-section");
    if (lezioniSection) lezioniSection.classList.remove("hidden");
    if (tabLezioni) tabLezioni.classList.add("active");

    renderLezioni();

    scrollToSection("lezioniSection");
    return;
  }

  if (tab === "prenotazioni") {
    if (prenotazioniWrapper) prenotazioniWrapper.classList.add("active-section");
    if (prenotazioniSection) prenotazioniSection.classList.remove("hidden");
    if (tabPrenotazioni) tabPrenotazioni.classList.add("active");

    loadPrenotazioni();
    const nuovoBox = document.getElementById("nuovaPrenotazioneBox");
    if (nuovoBox) nuovoBox.classList.add("hidden");


    scrollToSection("prenotazioniSection");
    return;
  }

  if (tab === "pacchetti") {
    if (pacchettiWrapper) pacchettiWrapper.classList.add("active-section");
    if (pacchettiSection) pacchettiSection.classList.remove("hidden");
    if (tabPacchetti) tabPacchetti.classList.add("active");

    const reportBox = document.getElementById("reportPacchettiBox");
    if (reportBox) reportBox.classList.add("hidden");

    loadPacchetti();
    const nuovoBox = document.getElementById("nuovoPacchettoBox");
    if (nuovoBox) nuovoBox.classList.add("hidden");

    scrollToSection("pacchettiSection");
    return;
  }

  if (tab === "reportPacchetti") {
    if (pacchettiWrapper) pacchettiWrapper.classList.add("active-section");
    if (pacchettiSection) pacchettiSection.classList.remove("hidden");
    if (tabReportPacchetti) tabReportPacchetti.classList.add("active");

    const reportBox = document.getElementById("reportPacchettiBox");
    if (reportBox) reportBox.classList.remove("hidden");

    renderReportPacchetti();

    scrollToSection("pacchettiSection");
    return;
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

/* ===================== PACCHETTI BASE =====================
   Estratti in /js/modules/pacchetti.js
===================== */

/* aggiungiPacchetto estratta in /js/modules/pacchetti.js */



async function riconciliaAccontoNuovoPacchetto(nuovoPacchetto) {
  try {
    const pending = window.pendingAccontoNuovoPacchetto;

    // ============================
    // 0) NESSUN ACCONTO PENDING
    // ============================
    if (!pending || !pending.idCliente || !pending.acconto) {
      console.log("ℹ️ Nessun acconto pending da riconciliare");
      return { ok: true, skipped: true, reason: "nessun_acconto_pending" };
    }

    // ============================
    // 1) VALIDAZIONE PACCHETTO
    // ============================
    if (!nuovoPacchetto || !nuovoPacchetto.ID_Pacchetto) {
      console.error("❌ Nuovo pacchetto non valido:", nuovoPacchetto);
      return { ok: false, error: new Error("Nuovo pacchetto non valido") };
    }

    if (String(nuovoPacchetto.ID_Cliente) !== String(pending.idCliente)) {
      console.error("❌ Cliente mismatch tra acconto e pacchetto");
      return { ok: false, error: new Error("Cliente mismatch") };
    }

    console.log("🔄 Avvio riconciliazione:", { pending, nuovoPacchetto });

    const idMovimentoPreciso = pending.accontoMovimentoId || null;
    const importoAcconto = Number(pending.acconto || 0);
    let movimento = null;

    // ============================
    // 2) MATCH PER ID_MOVIMENTO
    // ============================
    if (idMovimentoPreciso) {
      const { data, error } = await supabaseClient
        .from("studio_act")
        .select("*")
        .eq("id_movimento", idMovimentoPreciso)
        .limit(1);

      if (error) {
        console.error("❌ Errore ricerca per id_movimento:", error);
        return { ok: false, error };
      }

      if (data && data.length) {
        movimento = data[0];
        console.log("✅ Movimento trovato per id:", movimento.id_movimento);
      }
    }

    // ============================
    // 3) FALLBACK CONTROLLATO
    // ============================
    if (!movimento) {
      console.warn("⚠️ Uso fallback controllato");

      const { data, error } = await supabaseClient
        .from("studio_act")
        .select("*")
        .eq("id_cliente", pending.idCliente)
        .eq("riferimento", "acconto_nuovo_pacchetto")
        .eq("flag_c", "Da definire")
        .order("data", { ascending: false })
        .limit(10);

      if (error) {
        console.error("❌ Errore fallback:", error);
        return { ok: false, error };
      }

      movimento = (data || []).find(m => {
        const imp = Number(m.importo || 0);
        return Math.abs(imp - importoAcconto) < 0.01;
      }) || null;

      if (movimento) {
        console.log("✅ Movimento trovato via fallback:", movimento.id_movimento);
      }
    }

    // ============================
    // 4) NESSUN MOVIMENTO
    // ============================
    if (!movimento) {
      console.warn("⚠️ Nessun movimento trovato");
      return { ok: true, skipped: true, reason: "nss_movimento" };
    }

    // ============================
    // 5) VALIDAZIONI SICUREZZA
    // ============================
    if (!movimento.id_movimento) {
      return { ok: false, error: new Error("Movimento senza id_movimento") };
    }

    if (String(movimento.id_cliente) !== String(pending.idCliente)) {
      return { ok: false, error: new Error("Movimento cliente diverso") };
    }

    if (movimento.riferimento !== "acconto_nuovo_pacchetto") {
      return { ok: true, skipped: true, reason: "gia_riconciliato" };
    }

    if (movimento.flag_c !== "Da definire") {
      return { ok: true, skipped: true, reason: "flag_gia_definito" };
    }

    if (movimento.id_pacchetto) {
      return { ok: true, skipped: true, reason: "gia_collegato" };
    }

    // ============================
    // 6) DATI CLIENTE
    // ============================
    const cliente = clientiData.find(c =>
      String(c.ID_Cliente) === String(nuovoPacchetto.ID_Cliente)
    );

    const nomeCliente = cliente
      ? `${cliente.Nome || ""} ${cliente.Cognome || ""}`.trim()
      : "Cliente";

    // ============================
    // 7) PREPARA UPDATE
    // ============================
    const updatePayload = {
      id_pacchetto: nuovoPacchetto.ID_Pacchetto,
      flag_c: nuovoPacchetto.Flag_C || "No",
      categoria: "Incasso Pacchetto",
      riferimento: nuovoPacchetto.ID_Pacchetto,
      descrizione: `${nomeCliente} - ${nuovoPacchetto.Tipo_Pacchetto || ""} - acconto riconciliato`
    };

    console.log("🧾 Update:", updatePayload);

    // ============================
    // 8) UPDATE SU DB
    // ============================

const updatedData = await safeUpdate("studio_act", updatePayload, {
  id_movimento: movimento.id_movimento
});

if (!updatedData || !updatedData.length) {
  return { ok: false, error: new Error("Nessuna riga aggiornata") };
}

console.log("✅ Acconto riconciliato correttamente:", movimento.id_movimento);

return {
  ok: true,
  movimentoId: movimento.id_movimento,
  updatedRow: updatedData[0]
};

  } catch (err) {
    console.error("❌ Errore generale riconciliazione:", err);
    return { ok: false, error: err };
  }
}


/* pulisciFormPacchetto, renderPacchetti e renderPacchettiMobileSafe
   estratte in /js/modules/pacchetti.js */

/* eliminaPacchetto estratta in /js/modules/pacchetti.js */

/* dettaglio, modifica inline e salvataggio modifica pacchetto
   estratti in /js/modules/pacchetti.js */

/* ===================== REPORT PACCHETTI =====================
   Estratti in /js/modules/pacchetti.js
===================== */

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

  const ultimaOra = leggiSmartValue(SMART_KEYS.ultimoOrarioLezione);
  const ultimaTipologia = leggiSmartValue(SMART_KEYS.ultimaTipologiaLezione);
  const ultimoIstruttore = leggiSmartValue(SMART_KEYS.ultimoIstruttoreLezione);

  if (ora && !ora.value) {
    if (ultimaOra && selectContieneValore(ora, ultimaOra)) {
      ora.value = ultimaOra;
    } else {
      ora.value = "";
    }
  }

  if (tipologia && !tipologia.value) {
    tipologia.value = ultimaTipologia || "";
  }

  if (istruttore && !istruttore.value) {
    istruttore.value = ultimoIstruttore || "Laura";
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

  try {
  await safeInsert("lezioni", payload);
} catch (error) {
  console.error("Errore salvaLezioneDaAgenda:", error);
  setStatus("Errore salvataggio lezione da Agenda", "err");
  return;
}

  ricordaSmartLezione(Tipologia, Istruttore, Ora);

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
      🧑‍🤝‍🧑 ${stats.totalePrenotati}/${stats.totalePosti} prenotazioni · 
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
          🧑‍🤝‍🧑 ${prenotati}/${max} · Rimasti: ${rimasti}
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

  try {
    await safeDelete("prenotazioni", { ID_Lezione: idLezione });
    await safeDelete("lezioni", { ID_Lezione: idLezione });

    chiudiDettaglioAgendaSeAperto();

    await loadLezioni();
    await loadPrenotazioni();

    renderCalendario();

    setStatus("Lezione eliminata da Agenda correttamente ✅", "ok");

  } catch (error) {
    console.error("Errore eliminazione lezione da Agenda:", error);
    setStatus("Errore eliminazione lezione", "err");
  }
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
        🧘 Lezioni
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
/* formatEuro(value) estratta in /js/utils/format.js */

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
  renderGraficoRicaviMensiliTipologia(result);
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

function getLabelMeseGrafico(meseKey) {
  if (!meseKey) return "";

  const mesi = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic"
  ];

  const parti = String(meseKey).split("-");
  const anno = parti[0] || "";
  const meseNumero = Number(parti[1] || 0);
  const nomeMese = mesi[meseNumero - 1] || meseKey;

  return `${nomeMese} ${anno}`;
}

function renderGraficoRicaviMensili(dataMensile) {
  const canvas = document.getElementById("graficoRicaviMensili");

  if (!canvas) return;

  if (typeof Chart === "undefined") {
    console.warn("Chart.js non caricato");
    return;
  }

  const entries = Object.entries(dataMensile || {});

  if (!entries.length) {
    if (graficoRicaviMensiliInstance) {
      graficoRicaviMensiliInstance.destroy();
      graficoRicaviMensiliInstance = null;
    }
    return;
  }

  // I dati della dashboard sono in ordine dal più recente al più vecchio.
  // Per il grafico li ribaltiamo: dal più vecchio al più recente.
  const entriesOrdinate = [...entries].reverse();

  const labels = entriesOrdinate.map(([mese]) => {
    return getLabelMeseGrafico(mese);
  });

  const valori = entriesOrdinate.map(([, valoriMese]) => {
    return Number(valoriMese.Totale || 0);
  });

  if (graficoRicaviMensiliInstance) {
    graficoRicaviMensiliInstance.destroy();
  }

  graficoRicaviMensiliInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ricavi mensili",
          data: valori,
          tension: 0.35,
          fill: false,
          borderColor: "#007aff",
          backgroundColor: "#007aff",
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = Number(context.parsed.y || 0);
              return `Ricavi: ${formatEuro(value)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatEuro(value);
            }
          }
        }
      }
    }
  });
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
  renderGraficoRicaviSettimanali(result);
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

function getLabelMeseDashboard(meseKey) {
  if (!meseKey) return "";

  const mesi = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic"
  ];

  const parti = String(meseKey).split("-");
  const anno = parti[0] || "";
  const meseNumero = Number(parti[1] || 0);
  const nomeMese = mesi[meseNumero - 1] || meseKey;

  return `${nomeMese} ${anno}`;
}

function getLabelSettimanaDashboard(settimanaKey) {
  if (!settimanaKey) return "";

  const start = new Date(settimanaKey + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const giornoStart = String(start.getDate()).padStart(2, "0");
  const meseStart = String(start.getMonth() + 1).padStart(2, "0");

  const giornoEnd = String(end.getDate()).padStart(2, "0");
  const meseEnd = String(end.getMonth() + 1).padStart(2, "0");

  return `${giornoStart}/${meseStart} - ${giornoEnd}/${meseEnd}`;
}

function renderGraficoRicaviSettimanali(dataSettimanale) {

  const canvas = document.getElementById("graficoRicaviSettimanali");
  if (!canvas) return;

  if (typeof Chart === "undefined") {
    console.warn("Chart.js non caricato");
    return;
  }

  const entries = Object.entries(dataSettimanale || {});
  if (!entries.length) return;

  const entriesOrdinate = [...entries].reverse();

  const labels = entriesOrdinate.map(([settimana]) => {
    return getLabelSettimanaDashboard(settimana);
  });

  const giorni = [
    { key: 1, label: "Lun", color: "#1f4e5f" },
    { key: 2, label: "Mar", color: "#ff8c42" },
    { key: 3, label: "Mer", color: "#2b7a0b" },
    { key: 4, label: "Gio", color: "#2aa1c0" },
    { key: 5, label: "Ven", color: "#8e3aa5" },
    { key: 6, label: "Sab", color: "#9aa0a6" },
    { key: 0, label: "Dom", color: "#c0392b" }
  ];

  const datasets = giorni.map(g => ({
    label: g.label,
    data: entriesOrdinate.map(([, val]) => Number(val[g.key] || 0)),
    backgroundColor: g.color,
    stack: "stack1"
  }));

  // ✅ plugin totale sopra colonne
  const pluginTotali = {
    id: 'totaliSettimanali',
    afterDatasetsDraw(chart) {

      const { ctx } = chart;
      ctx.save();

      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";

      const labelsCount = chart.data.labels.length;

      for (let i = 0; i < labelsCount; i++) {

        let totale = 0;

        chart.data.datasets.forEach(dataset => {
          totale += Number(dataset.data[i] || 0);
        });

        if (totale === 0) continue;

        const meta = chart.getDatasetMeta(chart.data.datasets.length - 1);
        const el = meta.data[i];
        if (!el) continue;

        ctx.fillText(formatEuro(totale), el.x, el.y - 8);
      }

      ctx.restore();
    }
  };

  if (graficoRicaviSettimanaliInstance) {
    graficoRicaviSettimanaliInstance.destroy();
  }

  graficoRicaviSettimanaliInstance = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            footer: function (items) {
              let tot = 0;
              items.forEach(i => tot += Number(i.parsed.y || 0));
              return "Totale: " + formatEuro(tot);
            }
          }
        }
      },

      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            callback: v => formatEuro(v)
          }
        }
      }
    },

    plugins: [pluginTotali]
  });
}

function renderGraficoRicaviMensiliTipologia(dataMensile) {

  const canvas = document.getElementById("graficoRicaviMensiliTipologia");
  if (!canvas) return;

  if (typeof Chart === "undefined") {
    console.warn("Chart.js non caricato");
    return;
  }

  const entries = Object.entries(dataMensile || {});
  if (!entries.length) return;

  const entriesOrdinate = [...entries].reverse();

  const labels = entriesOrdinate.map(([mese]) => {
    return getLabelMeseDashboard(mese);
  });

  const datasets = [
    {
      label: "Privata",
      data: entriesOrdinate.map(([, v]) => Number(v.Privata || 0)),
      backgroundColor: "#1261a0",
      stack: "stack1"
    },
    {
      label: "Duetto",
      data: entriesOrdinate.map(([, v]) => Number(v.Duetto || 0)),
      backgroundColor: "#8e44ad",
      stack: "stack1"
    },
    {
      label: "Mini-Gruppo",
      data: entriesOrdinate.map(([, v]) => Number(v["Mini-Gruppo"] || 0)),
      backgroundColor: "#f4b400",
      stack: "stack1"
    }
  ];

  // ✅ plugin totale sopra colonne
  const pluginTotali = {
    id: 'totaliMensili',
    afterDatasetsDraw(chart) {

      const { ctx } = chart;
      ctx.save();

      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";

      const labelsCount = chart.data.labels.length;

      for (let i = 0; i < labelsCount; i++) {

        let totale = 0;

        chart.data.datasets.forEach(dataset => {
          totale += Number(dataset.data[i] || 0);
        });

        if (totale === 0) continue;

        const meta = chart.getDatasetMeta(chart.data.datasets.length - 1);
        const el = meta.data[i];
        if (!el) continue;

        ctx.fillText(formatEuro(totale), el.x, el.y - 8);
      }

      ctx.restore();
    }
  };

  if (graficoRicaviMensiliTipologiaInstance) {
    graficoRicaviMensiliTipologiaInstance.destroy();
  }

  graficoRicaviMensiliTipologiaInstance = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            footer: function (items) {
              let tot = 0;
              items.forEach(i => tot += Number(i.parsed.y || 0));
              return "Totale: " + formatEuro(tot);
            }
          }
        }
      },

      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            callback: v => formatEuro(v)
          }
        }
      }
    },

    plugins: [pluginTotali]
  });
}


function leggiCampoConti(row, ...nomi) {
  for (const nome of nomi) {
    if (row && row[nome] !== undefined && row[nome] !== null) {
      return row[nome];
    }
  }
  return "";
}

function getContiData(row) {
  return leggiCampoConti(row, "data", "Data");
}

function getContiTipo(row) {
  return leggiCampoConti(row, "tipo", "Tipo");
}

function getContiCategoria(row) {
  return leggiCampoConti(row, "categoria", "Categoria");
}

function getContiDescrizione(row) {
  return leggiCampoConti(row, "descrizione", "Descrizione");
}

function getContiImporto(row) {
  return Number(leggiCampoConti(row, "importo", "Importo") || 0);
}

function getContiMetodo(row) {
  return leggiCampoConti(row, "metodo_pagamento", "Metodo_Pagamento");
}

function getContiNote(row) {
  return leggiCampoConti(row, "note", "Note");
}

function getContiFlagC(row) {
  return leggiCampoConti(row, "flag_c", "Flag_C") || "";
}

function getTodayDataConti() {
  return getTodayString();
}

async function registraMovimentiContiDaIncasso(idCliente, metodo, note, allocazioni, eccedenza) {
  try {
    console.log("💼 Avvio registraMovimentiContiDaIncasso:", {
      idCliente,
      metodo,
      note,
      allocazioni,
      eccedenza
    });

    // ============================
    // 1) VALIDAZIONE CLIENTE
    // ============================
    if (!idCliente) {
      console.error("❌ idCliente mancante per registrazione Conti Studio");

      return {
        ok: false,
        error: new Error("idCliente mancante per registrazione Conti Studio"),
        data: [],
        accontoMovimentoId: null
      };
    }

    const cliente = clientiData.find(c =>
      String(c.ID_Cliente) === String(idCliente)
    );

    const clienteNome = cliente
      ? `${cliente.Nome || ""} ${cliente.Cognome || ""}`.trim()
      : "Cliente non trovato";

    // ============================
    // 2) NORMALIZZAZIONE INPUT
    // ============================
    const metodoPagamento = String(metodo || "").trim();
    const notePulite = String(note || "").trim();
    const listaAllocazioni = Array.isArray(allocazioni) ? allocazioni : [];
    const importoEccedenza = Number(eccedenza || 0);

    const movimenti = [];

    // ============================
    // 3) MOVIMENTI SU PACCHETTI ESISTENTI
    // ============================
    listaAllocazioni.forEach(item => {
      if (!item) return;

      const idPacchetto = String(item.idPacchetto || "").trim();
      const tipoPacchetto = String(item.tipoPacchetto || "").trim();
      const flagC = String(item.flagC || "No").trim();
      const quotaAllocata = Number(item.quotaAllocata || 0);

      if (!idPacchetto) {
        console.warn("⚠️ Allocazione senza idPacchetto ignorata:", item);
        return;
      }

      if (!quotaAllocata || quotaAllocata <= 0) {
        console.warn("⚠️ Allocazione con importo non valido ignorata:", item);
        return;
      }

      movimenti.push({
        data: getTodayDataConti(),
        tipo: "Entrata",
        categoria: "Incasso Pacchetto",
        descrizione: `${clienteNome} - ${tipoPacchetto}`,
        importo: Number(quotaAllocata.toFixed(2)),
        metodo_pagamento: metodoPagamento,
        note: notePulite || `Incasso su pacchetto ${idPacchetto}`,
        id_cliente: idCliente,
        id_pacchetto: idPacchetto,
        flag_c: flagC || "No",
        origine: "incasso_cliente",
        riferimento: idPacchetto
      });
    });

    // ============================
    // 4) MOVIMENTO ECCEDENZA / ACCONTO NUOVO PACCHETTO
    // ============================
    if (importoEccedenza > 0.009) {
      movimenti.push({
        data: getTodayDataConti(),
        tipo: "Entrata",
        categoria: "Acconto Nuovo Pacchetto",
        descrizione: `${clienteNome} - Acconto nuovo pacchetto`,
        importo: Number(importoEccedenza.toFixed(2)),
        metodo_pagamento: metodoPagamento,
        note: notePulite || "Acconto da incasso eccedente / senza Da_Pagare aperti",
        id_cliente: idCliente,
        id_pacchetto: "",
        flag_c: "Da definire",
        origine: "incasso_cliente",
        riferimento: "acconto_nuovo_pacchetto"
      });
    }

    // ============================
    // 5) NESSUN MOVIMENTO DA REGISTRARE
    // ============================
    if (!movimenti.length) {
      console.warn("⚠️ Nessun movimento Conti Studio da registrare");

      return {
        ok: true,
        skipped: true,
        reason: "nessun_movimento_da_registrare",
        data: [],
        accontoMovimentoId: null
      };
    }

    console.log("💼 Movimenti Conti Studio da inserire:", movimenti);

    // ============================
    // 6) INSERT SU SUPABASE VIA SAFE INSERT
    // ============================
    const data = await safeInsert("studio_act", movimenti);

    if (!data || !data.length) {
      console.error("❌ Supabase non ha restituito movimenti Conti Studio");

      return {
        ok: false,
        error: new Error("Supabase non ha restituito movimenti Conti Studio"),
        data: [],
        accontoMovimentoId: null
      };
    }

    console.log("✅ Movimenti Conti Studio registrati:", data);

    // ============================
    // 7) RECUPERO MOVIMENTO ACCONTO
    // ============================
    const movimentoAcconto = data.find(m =>
      String(m.riferimento || "") === "acconto_nuovo_pacchetto" &&
      String(m.flag_c || "") === "Da definire" &&
      String(m.id_cliente || "") === String(idCliente)
    );

    let accontoMovimentoId = null;

    if (movimentoAcconto) {
      if (!movimentoAcconto.id_movimento) {
        console.error("❌ Movimento acconto creato ma senza id_movimento:", movimentoAcconto);

        return {
          ok: false,
          error: new Error("Movimento acconto creato ma senza id_movimento"),
          data: data,
          accontoMovimentoId: null
        };
      }

      accontoMovimentoId = movimentoAcconto.id_movimento;

      console.log("✅ ID movimento acconto:", accontoMovimentoId);
    } else {
      console.log("ℹ️ Nessun movimento acconto nuovo pacchetto generato");
    }

    // ============================
    // 8) RETURN OK
    // ============================
    return {
      ok: true,
      data: data,
      accontoMovimentoId: accontoMovimentoId
    };

  } catch (error) {
    console.error("❌ Errore imprevisto registraMovimentiContiDaIncasso:", error);

    return {
      ok: false,
      error: error,
      data: [],
      accontoMovimentoId: null
    };
  }
}


// ============================
// CONTI STUDIO
// ============================
/* loadConti estratta in /js/modules/conti.js */




// INSERT
async function aggiungiMovimentoConti() {
  const movimento = {
    data: document.getElementById("conti_data")?.value || "",
    tipo: document.getElementById("conti_tipo")?.value || "",
    categoria: document.getElementById("conti_categoria")?.value || "",
    descrizione: document.getElementById("conti_descrizione")?.value || "",
    importo: parseFloat(document.getElementById("conti_importo")?.value || 0),
    metodo_pagamento: document.getElementById("conti_metodo")?.value || "",
    note: document.getElementById("conti_note")?.value || "",
    flag_c: "No",
    origine: "manuale",
    riferimento: ""
  };

  if (!movimento.data || !movimento.categoria || !movimento.importo) {
    alert("Compila Data, Categoria e Importo");
    return;
  }

  try {
  await safeInsert("studio_act", movimento);
} catch (error) {
  console.error("Errore aggiungiMovimentoConti:", error);
  alert("Errore salvataggio movimento");
  return;
}


  document.getElementById("conti_data").value = "";
  document.getElementById("conti_categoria").value = "";
  document.getElementById("conti_descrizione").value = "";
  document.getElementById("conti_importo").value = "";
  document.getElementById("conti_metodo").value = "";
  document.getElementById("conti_note").value = "";

  await loadConti();

  setStatus("Movimento Conti Studio salvato ✅", "ok");
}


// KPI
function renderContiKpi() {

  const kpiEntrate = document.getElementById("contiEntrate");
  const kpiUscite = document.getElementById("contiUscite");
  const kpiSaldo = document.getElementById("contiSaldo");
  const kpiExtra = document.getElementById("contiExtra");

  if (!contiData || !contiData.length) {
    if (kpiEntrate) kpiEntrate.innerText = "€ 0";
    if (kpiUscite) kpiUscite.innerText = "€ 0";
    if (kpiSaldo) kpiSaldo.innerText = "€ 0";
    if (kpiExtra) kpiExtra.innerHTML = "";
    return;
  }

  // ============================
  // ✅ BASE
  // ============================
  let entrate = 0;
  let uscite = 0;

  contiData.forEach(m => {
    const importo = Number(m.importo || 0);

    if (String(m.tipo).toLowerCase() === "entrata") {
      entrate += importo;
    } else {
      uscite += importo;
    }
  });

  const saldo = entrate - uscite;

  if (kpiEntrate) kpiEntrate.innerText = `€ ${formatEuro(entrate)}`;
  if (kpiUscite) kpiUscite.innerText = `€ ${formatEuro(uscite)}`;
  if (kpiSaldo) kpiSaldo.innerText = `€ ${formatEuro(saldo)}`;

  // ============================
  // ✅ LOGICA CORRETTA FLAG_C
  // ============================

  const entrateFiltrate = contiData.filter(m =>
    String(m.tipo).toLowerCase() === "entrata" &&
    String(m.riferimento) !== "acconto_nuovo_pacchetto"
  );

  const incassiTotali = entrateFiltrate.reduce(
    (sum, m) => sum + Number(m.importo || 0),
    0
  );

  const incassiCash = entrateFiltrate
    .filter(m => String(m.flag_c) === "Si")
    .reduce((sum, m) => sum + Number(m.importo || 0), 0);

  const imponibile = entrateFiltrate
    .filter(m => String(m.flag_c) === "No")
    .reduce((sum, m) => sum + Number(m.importo || 0), 0);

  // ============================
  // ✅ PARAMETRI FISCALI
  // ============================

  const COEFF = 0.78;
  const ALIQUOTA_IMPOSTA = 0.05;
  const ALIQUOTA_INPS = 0.2607;

  const baseFiscale = imponibile * COEFF;
  const imposta = baseFiscale * ALIQUOTA_IMPOSTA;
  const inps = baseFiscale * ALIQUOTA_INPS;
  const utileNetto = incassiTotali - imposta - inps;

  // ============================
  // ✅ UI COMPLETA
  // ============================

  if (kpiExtra) {
    kpiExtra.innerHTML = `
      <div style="margin-top:10px; font-size:13px;">

        <div>💰 Incassi Totali: <b>€ ${formatEuro(incassiTotali)}</b></div>
        

        <div style="margin-top:6px;">
          💳 Incassi Cash: <b>€ ${formatEuro(incassiCash)}</b>
        </div>

        <div style="margin-top:6px; color:#007aff;">
          📊 Imponibile: <b>€ ${formatEuro(imponibile)}</b>
        </div>

        <hr style="margin:10px 0;"/>

        <div>📉 Base 78%: € ${formatEuro(baseFiscale)}</div>
        <div>🧾 Imposta (5%): € ${formatEuro(imposta)}</div>
        <div>🏦 INPS (26.07%): € ${formatEuro(inps)}</div>

        <hr style="margin:10px 0;"/>

        <div style="font-size:15px; font-weight:600;">
          💰 Utile Netto: 
          <span style="color:#34c759;">
            € ${formatEuro(utileNetto)}
          </span>
        </div>

      </div>
    `;
  }

  // ✅ IMPORTANTISSIMO
  renderGraficoFiscale();
}


function calcolaFiscalePerMese() {
  const COEFF_REDDITIVITA = 0.78;
  const ALIQUOTA_IMPOSTA = 0.05;
  const ALIQUOTA_INPS = 0.2607;

  const mesi = {};

  contiData.forEach(m => {
    const data = m.data;
    if (!data) return;

    const mese = data.substring(0, 7); // YYYY-MM

    if (!mesi[mese]) {
      mesi[mese] = {
        incassi: 0,
        imponibile: 0,
        imposta: 0,
        inps: 0,
        utile: 0
      };
    }

    if (String(m.tipo).toLowerCase() === "entrata") {
      if (String(m.riferimento) !== "acconto_nuovo_pacchetto") {
        mesi[mese].incassi += Number(m.importo || 0);
      }
    }
  });

  Object.keys(mesi).forEach(mese => {
    const inc = mesi[mese].incassi;
    const imponibile = inc * COEFF_REDDITIVITA;
    const imposta = imponibile * ALIQUOTA_IMPOSTA;
    const inps = imponibile * ALIQUOTA_INPS;
    const utile = inc - imposta - inps;

    mesi[mese].imponibile = imponibile;
    mesi[mese].imposta = imposta;
    mesi[mese].inps = inps;
    mesi[mese].utile = utile;
  });

  return mesi;
}


let chartFiscale = null;


function renderGraficoFiscale() {
  const canvas = document.getElementById("chartFiscale");

  if (!canvas) {
    console.warn("⚠️ Canvas chartFiscale non trovato");
    return;
  }

  if (!contiData || !contiData.length) {
    console.warn("⚠️ Nessun dato per grafico fiscale");
    return;
  }

  const dati = calcolaFiscalePerMese();

  const labels = Object.keys(dati).sort();
  const utili = labels.map(m => dati[m].utile);
  const imposte = labels.map(m => dati[m].imposta);
  const inps = labels.map(m => dati[m].inps);

  if (chartFiscale) {
    chartFiscale.destroy();
  }

  chartFiscale = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Utile Netto",
          data: utili,
          backgroundColor: "#34c759"
        },
        {
          label: "Imposte",
          data: imposte,
          backgroundColor: "#ff9500"
        },
        {
          label: "INPS",
          data: inps,
          backgroundColor: "#007aff"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Dashboard Fiscale Mensile" }
      }
    }
  });
}


// RENDER LISTA (mobile-first)
function renderConti() {
  const container = document.getElementById("contiList");
  if (!container) return;

  if (!contiData || !contiData.length) {
    container.innerHTML = `<div style="padding:15px;">Nessun movimento</div>`;
    return;
  }

  const html = contiData
    .map(row => {

      const isAcconto = row.riferimento === "acconto_nuovo_pacchetto";
      const isDaDefinire = String(row.flag_c) === "Da definire";
      const isEntrata = String(row.tipo).toLowerCase() === "entrata";

      const borderColor =
        isDaDefinire ? "#ff9500" :
        isAcconto ? "#007aff" :
        isEntrata ? "#34c759" : "#ff3b30";

      return `
      <div class="card-ios" style="border-left:4px solid ${borderColor}; margin-bottom:10px;">

        <div style="display:flex; justify-content:space-between; align-items:center;">

          <div>
            <div style="font-weight:600;">
              ${row.descrizione || ""}
            </div>

            <div style="font-size:12px; opacity:0.6;">
              ${row.data || ""} • ${row.categoria || ""}
            </div>
          </div>

          <div style="font-weight:600; font-size:16px; color:${isEntrata ? "#34c759" : "#ff3b30"};">
            € ${formatEuro(row.importo)}
          </div>

        </div>

        <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">

          ${
            isDaDefinire
              ? `<div class="tag-warning">Da definire</div>`
              : ""
          }

          ${
            isAcconto
              ? `<div class="tag-acconto">Acconto</div>`
              : ""
          }

          ${
            row.id_pacchetto
              ? `<div class="tag-success">Collegato</div>`
              : ""
          }

        </div>

      </div>
      `;
    })
    .join("");

  container.innerHTML = html;
}


// ============================
// AUTO CONTABILITA DA PACCHETTI
// ============================

async function registraEntrataPacchetto(pacchetto) {

  try {

    const movimento = {
      Data: pacchetto.Data_Inizio || new Date().toISOString().split("T")[0],
      Tipo: "Entrata",
      Categoria: "Pacchetti",
      Descrizione: `${pacchetto.Nome_Cliente || ""} - ${pacchetto.Tipo_Pacchetto || ""}`,
      Importo: Number(pacchetto.Importo || 0),
      Metodo_Pagamento: pacchetto.Metodo_Pagamento || "",
      Note: `Auto da ID Pacchetto: ${pacchetto.ID_Pacchetto || ""}`
    };

    if (!movimento.Importo || movimento.Importo <= 0) {
      return;
    }

    await safeInsert("studio_act", movimento);

  } catch (err) {
    console.error("Errore funzione contabilità:", err);
  }
}

// ============================
// FILTRO CONTI PER MESE
// ============================

/* applicaFiltroConti estratta in /js/modules/conti.js */


/* filtri conti estratti in /js/modules/conti.js */


// ============================
// LOGIN
// ============================

async function login() {

  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();
  const status = document.getElementById("loginStatus");

  if (!email || !password) {
    if (status) status.textContent = "Inserisci email e password";
    return;
  }

  if (status) status.textContent = "Login in corso...";

  try {

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    // ✅ PRIMA controlli errore
    if (error || !data || !data.user) {
      console.error("Errore login:", error);
      if (status) status.textContent = "❌ " + (error?.message || "Login fallito");
      return;
    }

    // ✅ SOLO DOPO imposti user
    window.currentUserId = data.user.id;

    if (status) status.textContent = "✅ Login ok";

    // ✅ redirect alla dashboard
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error(err);
    if (status) status.textContent = "❌ Errore login";
  }
}


function tornaDaDettaglioPacchetto() {
  console.log("↩️ Torna da dettaglio pacchetto");

  const nav = window.lastPacchettoNavigation || {};
  console.log("🧭 Contesto ritorno pacchetto:", nav);

  // ✅ Caso 1: arrivo da Clienti → Pacchetti Cliente → Dettaglio
  // Torno esattamente alla vista Pacchetti dello stesso cliente
  if (nav.origine === "clienti" && nav.idCliente) {
    const idCliente = nav.idCliente;

    console.log("✅ Ritorno ai pacchetti del cliente:", idCliente);

    vaiTab("clienti");

    setTimeout(() => {
      mostraPacchettiCliente(idCliente);

      const box = document.getElementById("outputClienti");
      if (box) {
        box.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }, 220);

    return;
  }

  // ✅ Caso 2: arrivo dalla lista globale Pacchetti
  console.log("➡️ Ritorno alla lista globale pacchetti");

  window.lastPacchettoNavigation = {
    origine: "pacchetti"
  };

  vaiTab("pacchetti");

  setTimeout(() => {
    loadPacchetti();

    const box = document.getElementById("outputPacchetti");
    if (box) {
      box.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, 180);
}



console.log("APP JS CARICATO OK");
