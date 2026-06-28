// ============================
// ✅ MODULO PACCHETTI BASE + UI + REPORT
// ============================

// Nota importante:
// usiamo var per rendere queste variabili disponibili globalmente
// anche agli altri script non-module caricati dopo questo file.
var pacchettiData = window.pacchettiData || [];
var daPagareManuale = window.daPagareManuale || false;
var lezioniAddManuale = window.lezioniAddManuale || false;

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
  window.pacchettiData = pacchettiData;

  pacchettiData.sort((a, b) => {
    const clienteA = clientiData.find(c =>
      String(c.ID_Cliente) === String(a.ID_Cliente)
    );

    const clienteB = clientiData.find(c =>
      String(c.ID_Cliente) === String(b.ID_Cliente)
    );

    const nomeA = String(clienteA?.Nome || "").toLowerCase();
    const nomeB = String(clienteB?.Nome || "").toLowerCase();

    if (nomeA < nomeB) return -1;
    if (nomeA > nomeB) return 1;

    const cognomeA = String(clienteA?.Cognome || "").toLowerCase();
    const cognomeB = String(clienteB?.Cognome || "").toLowerCase();

    if (cognomeA < cognomeB) return -1;
    if (cognomeA > cognomeB) return 1;

    return String(b.Valido_Da || "").localeCompare(
      String(a.Valido_Da || "")
    );
  });

  renderSelectPacchettoClienti();
  renderSelectTipiPacchetto();
  renderPacchetti();

  if (typeof aggiornaPacchettiPrenotazione === "function") {
    aggiornaPacchettiPrenotazione();
  }

  const reportBox = document.getElementById("reportPacchettiBox");

  if (
    reportBox &&
    !reportBox.classList.contains("hidden") &&
    typeof renderReportPacchetti === "function"
  ) {
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

  if (
    window.pendingAccontoNuovoPacchetto &&
    window.pendingAccontoNuovoPacchetto.idCliente &&
    String(window.pendingAccontoNuovoPacchetto.idCliente) === String(clienteValue)
  ) {
    setTimeout(() => {
      if (typeof applicaAccontoNuovoPacchetto === "function") {
        applicaAccontoNuovoPacchetto();
      }
    }, 0);
  }
}

function generaNuovoIdPacchetto() {
  return generaNuovoIdProgressivo("PC", pacchettiData, "ID_Pacchetto");
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
        <th>Azioni</th>
      </tr>
      ${pacchettiData.map(p => {
        const cliente = clientiData.find(c =>
          String(c.ID_Cliente) === String(p.ID_Cliente)
        );

        const clienteNome = cliente
          ? `${cliente.Nome || ""} ${cliente.Cognome || ""}`.trim()
          : "-";

        return `
          <tr>
            <td>${safe(p.ID_Pacchetto)}</td>
            <td>${safe(clienteNome)}</td>
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
            <td>
              <button onclick="mostraDettaglioPacchetto('${escapeQuote(p.ID_Pacchetto)}', 'pacchetti')">
                🔎 Dettaglio
              </button>
            </td>
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

    if (!pacchettiData.length) {
      out.innerHTML = `
        <div class="card-ios">
          <div class="card-title">Nessun pacchetto</div>
          <div class="card-sub">Non ci sono pacchetti registrati.</div>
        </div>
      `;
      return;
    }

    const cards = pacchettiData.map(p => {
      const cliente = clientiData.find(c =>
        String(c.ID_Cliente) === String(p.ID_Cliente)
      );

      const clienteNome = cliente
        ? `${cliente.Nome || ""} ${cliente.Cognome || ""}`.trim()
        : "Cliente non trovato";

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
            ⚖️ Lezioni Rimanenti: ${safe(lezioniRimanenti)}
          </div>
          <div class="card-sub">
            📅 Validità Da: ${safe(p.Valido_Da)}
          </div>
          <div class="card-sub">
            📅 Validità A: ${safe(p.Valido_A)}
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
            <button onclick="mostraDettaglioPacchetto('${escapeQuote(p.ID_Pacchetto)}', 'pacchetti')">
              🔎 Dettaglio
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

function mostraDettaglioPacchetto(idPacchetto, origine = null) {
  const out = document.getElementById("outputPacchetti");
  if (!out) return;

  const p = pacchettiData.find(x =>
    String(x.ID_Pacchetto) === String(idPacchetto)
  );

  if (!p) {
    setStatus("Pacchetto non trovato", "err");
    return;
  }

  if (origine === "pacchetti") {
    window.lastPacchettoNavigation = {
      origine: "pacchetti",
      idCliente: p.ID_Cliente,
      idPacchetto: p.ID_Pacchetto
    };
  }

  if (origine === "clienti") {
    window.lastPacchettoNavigation = {
      origine: "clienti",
      idCliente: p.ID_Cliente,
      idPacchetto: p.ID_Pacchetto
    };
  }

  const cliente = clientiData.find(c =>
    String(c.ID_Cliente) === String(p.ID_Cliente)
  );

  const nomeCliente = cliente
    ? `${cliente.Nome || ""} ${cliente.Cognome || ""}`.trim()
    : "Cliente non trovato";

  const lezioniTotali = Number(p.Lezioni_Totali || 0);
  const lezioniUsate = contaPrenotazioniPacchetto(p.ID_Pacchetto);
  const lezioniRimanenti = lezioniTotali - lezioniUsate;
  const daPagare = Number(p.Da_Pagare || 0);

  const alertDaPagare = !isPacchettoChiuso(p) && daPagare > 0;
  const alertInScadenza = !isPacchettoChiuso(p) && lezioniRimanenti <= 2;

  animateView(out, `
    <div class="app-toolbar">
      <button class="app-back-btn" onclick="tornaDaDettaglioPacchetto()">
        ← Indietro
      </button>
    </div>

    <div class="card-ios">
      <div class="card-title">
        🔎 Dettaglio Pacchetto
      </div>

      <div class="card-sub"><strong>Cliente:</strong> ${safe(nomeCliente)}</div>
      <div class="card-sub"><strong>ID Pacchetto:</strong> ${safe(p.ID_Pacchetto)}</div>
      <div class="card-sub"><strong>ID Cliente:</strong> ${safe(p.ID_Cliente)}</div>
      <div class="card-sub"><strong>Tipo Pacchetto:</strong> ${safe(p.Tipo_Pacchetto)}</div>
      <div class="card-sub"><strong>Lezioni Base:</strong> ${safe(p.Lezioni_Base)}</div>
      <div class="card-sub"><strong>Lezioni Add:</strong> ${safe(p.Lezioni_Add)}</div>
      <div class="card-sub"><strong>Lezioni Totali:</strong> ${safe(p.Lezioni_Totali)}</div>
      <div class="card-sub"><strong>Lezioni Usate:</strong> ${safe(lezioniUsate)}</div>
      <div class="card-sub"><strong>Lezioni Rimanenti:</strong> ${safe(lezioniRimanenti)}</div>
      <div class="card-sub"><strong>Prezzo:</strong> ${safe(p.Prezzo)}</div>
      <div class="card-sub"><strong>Flag Pagato:</strong> ${safe(p.Flag_Pagato)}</div>
      <div class="card-sub"><strong>Da Pagare:</strong> ${safe(p.Da_Pagare)}</div>
      <div class="card-sub"><strong>Flag C:</strong> ${safe(p.Flag_C)}</div>
      <div class="card-sub"><strong>Fattura Nr:</strong> ${safe(p.Fattura_Nr || "-")}</div>
      <div class="card-sub"><strong>Data Fattura:</strong> ${safe(p.Data_Fattura || "-")}</div>
      <div class="card-sub"><strong>Valido Da:</strong> ${safe(p.Valido_Da)}</div>
      <div class="card-sub"><strong>Valido A:</strong> ${safe(p.Valido_A)}</div>
      <div class="card-sub"><strong>Stato:</strong> ${safe(p.Stato || "Attivo")}</div>

      ${alertDaPagare ? `<div class="report-warning">⚠️ Da pagare: ${safe(daPagare)}</div>` : ""}
      ${alertInScadenza ? `<div class="report-warning">⚠️ In scadenza: ${safe(lezioniRimanenti)} lezioni rimanenti</div>` : ""}

      <div class="card-actions">
        <button onclick="mostraModificaPacchettoInline('${escapeQuote(p.ID_Pacchetto)}')">
          ✏️ Modifica
        </button>
        <button onclick="eliminaPacchetto('${escapeQuote(p.ID_Pacchetto)}')">
          🗑️ Elimina
        </button>
      </div>
    </div>
  `);
}

function mostraModificaPacchettoInline(idPacchetto) {
  const out = document.getElementById("outputPacchetti");
  if (!out) return;

  const p = pacchettiData.find(x =>
    String(x.ID_Pacchetto) === String(idPacchetto)
  );

  if (!p) {
    setStatus("Pacchetto non trovato", "err");
    return;
  }

  const clientiOptions = clientiData.map(c => {
    const selected =
      String(c.ID_Cliente) === String(p.ID_Cliente)
        ? "selected"
        : "";

    return `
      <option value="${escapeAttr(c.ID_Cliente)}" ${selected}>
        ${safe(c.Nome)} ${safe(c.Cognome)}
      </option>
    `;
  }).join("");

  const tipiOptions = Object.keys(TIPI_PACCHETTO).map(tipo => {
    const selected =
      String(tipo) === String(p.Tipo_Pacchetto)
        ? "selected"
        : "";

    return `
      <option value="${escapeAttr(tipo)}" ${selected}>
        ${safe(tipo)}
      </option>
    `;
  }).join("");

  animateView(out, `
    <div class="app-toolbar">
      <button class="app-back-btn" onclick="mostraDettaglioPacchetto('${escapeQuote(idPacchetto)}')">
        ← Dettaglio
      </button>
    </div>

    <div class="card-ios">
      <div class="card-title">
        ✏️ Modifica Pacchetto
      </div>

      <div class="card-sub">
        <strong>ID Pacchetto:</strong> ${safe(p.ID_Pacchetto)}
      </div>

      <div class="form-row">
        <label class="field-block">
          <span class="field-label">Cliente</span>
          <select id="edit_pac_cliente">
            ${clientiOptions}
          </select>
        </label>

        <label class="field-block">
          <span class="field-label">Tipo Pacchetto</span>
          <select id="edit_pac_tipo" onchange="aggiornaCalcoliModificaPacchetto()">
            ${tipiOptions}
          </select>
        </label>
      </div>

      <div class="form-row">
        <label class="field-block">
          <span class="field-label">Lezioni Base</span>
          <input id="edit_pac_lezioni_base" type="number" value="${escapeAttr(p.Lezioni_Base)}">
        </label>

        <label class="field-block">
          <span class="field-label">Lezioni Add</span>
          <input id="edit_pac_lezioni_add" type="number" value="${escapeAttr(p.Lezioni_Add)}" oninput="aggiornaCalcoliModificaPacchetto()">
        </label>

        <label class="field-block">
          <span class="field-label">Lezioni Totali</span>
          <input id="edit_pac_lezioni_totali" type="number" value="${escapeAttr(p.Lezioni_Totali)}">
        </label>
      </div>

      <div class="form-row">
        <label class="field-block">
          <span class="field-label">Prezzo</span>
          <input id="edit_pac_prezzo" type="number" step="0.01" value="${escapeAttr(p.Prezzo)}">
        </label>

        <label class="field-block">
          <span class="field-label">Pagato</span>
          <select id="edit_pac_flag_pagato" onchange="aggiornaDaPagareModificaPacchetto()">
            <option value="Si" ${String(p.Flag_Pagato) === "Si" ? "selected" : ""}>Si</option>
            <option value="No" ${String(p.Flag_Pagato) === "No" ? "selected" : ""}>No</option>
          </select>
        </label>

        <label class="field-block">
          <span class="field-label">Da Pagare</span>
          <input id="edit_pac_da_pagare" type="number" step="0.01" value="${escapeAttr(p.Da_Pagare)}">
        </label>
      </div>

      <div class="form-row">
        <label class="field-block">
          <span class="field-label">Flag C</span>
          <select id="edit_pac_flag_c">
            <option value="Si" ${String(p.Flag_C) === "Si" ? "selected" : ""}>Si</option>
            <option value="No" ${String(p.Flag_C) === "No" ? "selected" : ""}>No</option>
          </select>
        </label>

        <label class="field-block">
          <span class="field-label">Fattura Nr</span>
          <input id="edit_pac_fattura_nr" value="${escapeAttr(p.Fattura_Nr)}">
        </label>

        <label class="field-block">
          <span class="field-label">Data Fattura</span>
          <input id="edit_pac_data_fattura" type="date" value="${escapeAttr(p.Data_Fattura)}">
        </label>
      </div>

      <div class="form-row">
        <label class="field-block">
          <span class="field-label">Valido Da</span>
          <input id="edit_pac_valido_da" type="date" value="${escapeAttr(p.Valido_Da)}" onchange="aggiornaCalcoliModificaPacchetto()">
        </label>

        <label class="field-block">
          <span class="field-label">Valido A</span>
          <input id="edit_pac_valido_a" type="date" value="${escapeAttr(p.Valido_A)}">
        </label>

        <label class="field-block">
          <span class="field-label">Stato</span>
          <select id="edit_pac_stato">
            <option value="Attivo" ${String(p.Stato) === "Attivo" ? "selected" : ""}>Attivo</option>
            <option value="Chiuso" ${String(p.Stato) === "Chiuso" ? "selected" : ""}>Chiuso</option>
          </select>
        </label>
      </div>

      <div class="card-actions">
        <button onclick="salvaModificaPacchettoInline('${escapeQuote(p.ID_Pacchetto)}')">
          💾 Salva
        </button>

        <button onclick="mostraDettaglioPacchetto('${escapeQuote(p.ID_Pacchetto)}')">
          Annulla
        </button>
      </div>
    </div>
  `);
}

function aggiornaCalcoliModificaPacchetto() {
  const tipoValue = document.getElementById("edit_pac_tipo")?.value || "";
  const tipo = TIPI_PACCHETTO[tipoValue];

  const lezioniBaseInput = document.getElementById("edit_pac_lezioni_base");
  const lezioniAddInput = document.getElementById("edit_pac_lezioni_add");
  const lezioniTotaliInput = document.getElementById("edit_pac_lezioni_totali");
  const validoDaInput = document.getElementById("edit_pac_valido_da");
  const validoAInput = document.getElementById("edit_pac_valido_a");

  if (tipo && lezioniBaseInput) {
    lezioniBaseInput.value = Number(tipo.Lezioni_Base || 0);
  }

  const base = Number(lezioniBaseInput?.value || 0);
  const add = Number(lezioniAddInput?.value || 0);

  if (lezioniTotaliInput) {
    lezioniTotaliInput.value = base + add;
  }

  if (tipo && validoDaInput?.value && validoAInput) {
    validoAInput.value = aggiungiMesiAData(
      validoDaInput.value,
      tipo.Scadenza_Mesi
    );
  }
}

function aggiornaDaPagareModificaPacchetto() {
  const flagPagato = document.getElementById("edit_pac_flag_pagato")?.value || "Si";
  const daPagareInput = document.getElementById("edit_pac_da_pagare");

  if (!daPagareInput) return;

  if (flagPagato === "Si") {
    daPagareInput.value = "0";
  }
}

async function salvaModificaPacchettoInline(idPacchetto) {
  const payload = {
    ID_Cliente: document.getElementById("edit_pac_cliente")?.value || "",
    Tipo_Pacchetto: document.getElementById("edit_pac_tipo")?.value || "",
    Lezioni_Base: Number(document.getElementById("edit_pac_lezioni_base")?.value || 0),
    Lezioni_Add: Number(document.getElementById("edit_pac_lezioni_add")?.value || 0),
    Lezioni_Totali: Number(document.getElementById("edit_pac_lezioni_totali")?.value || 0),
    Prezzo: Number(document.getElementById("edit_pac_prezzo")?.value || 0),
    Flag_Pagato: document.getElementById("edit_pac_flag_pagato")?.value || "Si",
    Da_Pagare: Number(document.getElementById("edit_pac_da_pagare")?.value || 0),
    Flag_C: document.getElementById("edit_pac_flag_c")?.value || "Si",
    Fattura_Nr: document.getElementById("edit_pac_fattura_nr")?.value.trim() || "",
    Data_Fattura: document.getElementById("edit_pac_data_fattura")?.value || null,
    Valido_Da: document.getElementById("edit_pac_valido_da")?.value || "",
    Valido_A: document.getElementById("edit_pac_valido_a")?.value || "",
    Stato: document.getElementById("edit_pac_stato")?.value || "Attivo"
  };

  if (!payload.ID_Cliente) {
    setStatus("Cliente obbligatorio", "err");
    return;
  }

  if (!payload.Tipo_Pacchetto) {
    setStatus("Tipo Pacchetto obbligatorio", "err");
    return;
  }

  if (!payload.Valido_Da || !payload.Valido_A) {
    setStatus("Valido Da e Valido A sono obbligatori", "err");
    return;
  }

  if (payload.Flag_Pagato === "Si") {
    payload.Da_Pagare = 0;
  }

  if (payload.Flag_C === "Si") {
    payload.Fattura_Nr = "";
  }

  try {
    await safeUpdate(
      "pacchetti",
      payload,
      { ID_Pacchetto: idPacchetto }
    );
  } catch (error) {
    console.error("Errore salvaModificaPacchettoInline:", error);
    setStatus("Errore modifica pacchetto", "err");
    return;
  }

  await loadPacchetti();

  if (typeof loadPrenotazioni === "function") {
    await loadPrenotazioni();
  }

  const reportBox = document.getElementById("reportPacchettiBox");

  if (
    reportBox &&
    !reportBox.classList.contains("hidden") &&
    typeof renderReportPacchetti === "function"
  ) {
    renderReportPacchetti();
  }

  setStatus("Pacchetto modificato correttamente ✅", "ok");

  setTimeout(() => {
    mostraDettaglioPacchetto(idPacchetto);
  }, 100);
}

/* ===================== REPORT PACCHETTI ===================== */

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

  if (reportPacchettiFiltro === "fatture") {
    return getPacchettiReportFattureMancanti();
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

  let titoloCorrente = "Da Pagare";

  if (reportPacchettiFiltro === "in_scadenza") {
    titoloCorrente = "In Scadenza";
  }

  if (reportPacchettiFiltro === "fatture") {
    titoloCorrente = "Fatture da emettere";
  }

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

      <button
        class="report-filter-btn ${reportPacchettiFiltro === "fatture" ? "active" : ""}"
        onclick="setReportPacchettiFiltro('fatture')"
      >
        🧾 Fatture da emettere: ${fattureMancantiItems.length}
      </button>
    </div>

    <h3>Alert ${titoloCorrente}</h3>

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

// ============================
// ✅ CREAZIONE PACCHETTO
// ============================

async function aggiungiPacchetto() {

  try {

    // ✅ raccogli dati (usa la tua logica esistente)
    const cliente = document.getElementById("pac_cliente")?.value;
    const tipo = document.getElementById("pac_tipo")?.value;
    const lezioniTotali = document.getElementById("pac_lezioni_totali")?.value;
    const prezzo = document.getElementById("pac_prezzo")?.value;
    const pagato = document.getElementById("pac_flag_pagato")?.value;
    const daPagare = document.getElementById("pac_da_pagare")?.value;

    if (!cliente || !tipo) {
      setStatus("Compila cliente e tipo pacchetto", "err");
      return;
    }

    // ✅ payload (mantieni i tuoi campi reali se diversi)
    const payload = {
      ID_Cliente: cliente,
      Tipo_Pacchetto: tipo,
      Lezioni_Totali: Number(lezioniTotali || 0),
      Prezzo: Number(prezzo || 0),
      Flag_Pagato: pagato,
      Da_Pagare: Number(daPagare || 0)
    };

    // ✅ salvataggio
    const { error } = await supabaseClient
      .from("pacchetti")
      .insert(payload);

    if (error) {
      console.error(error);
      setStatus("Errore salvataggio pacchetto", "err");
      return;
    }

    // ✅ FEEDBACK
    setStatus("Pacchetto creato ✅", "ok");

    // ✅ 1. chiudi modale
    chiudiModalPacchetto();

    // ✅ 2. refresh dati
    await loadPacchetti();
    await loadClienti();

    // ✅ 3. refresh UI principale
    renderCalendario();

    // ✅ 4. RITORNO ALLA LEZIONE (SUPER IMPORTANTE)
    if (window.idLezioneCorrente) {
      mostraDettaglioLezione(
        window.idLezioneCorrente,
        dettaglioLezioneBoxAttivo
      );
    }

  } catch (err) {
    console.error(err);
    setStatus("Errore imprevisto salvataggio", "err");
  }
}

// ============================
// ✅ ELIMINAZIONE PACCHETTO (SAFE)
// ============================

async function eliminaPacchetto(idPacchetto) {

  if (!confirm("Eliminare il pacchetto?")) return;

  try {

    await safeDelete("pacchetti", {
      ID_Pacchetto: idPacchetto
    });

  } catch (error) {
    console.error("Errore eliminaPacchetto:", error);
    setStatus("Errore eliminazione pacchetto", "err");
    return;
  }

  // ✅ reload dati
  await loadPacchetti();

  if (typeof loadPrenotazioni === "function") {
    await loadPrenotazioni();
  }

  // ✅ aggiorna report
  const reportBox = document.getElementById("reportPacchettiBox");

  if (
    reportBox &&
    !reportBox.classList.contains("hidden") &&
    typeof renderReportPacchetti === "function"
  ) {
    renderReportPacchetti();
  }

  setStatus("Pacchetto eliminato ✅", "ok");

}
