// ============================
// ✅ MODULO PACCHETTI BASE
// ============================

// ✅ usa variabile globale esistente
// (non ridefinire pacchettiData)

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

  if (typeof renderPacchetti === "function") {
    renderPacchetti();
  }

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

  // ✅ Se sto creando un nuovo pacchetto da eccedenza incasso,
  // ricalcolo Da_Pagare = Prezzo - Acconto.
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
