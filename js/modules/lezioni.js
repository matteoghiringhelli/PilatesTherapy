// ============================
// ✅ MODULO LEZIONI
// ============================

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

  if (typeof renderLezioniMobileSafe === "function") {
    renderLezioniMobileSafe();
  }

  renderSelectLezioni();

  if (typeof renderCalendario === "function") {
    renderCalendario();
  }
}

function getLezioniFiltrate() {
  return lezioniData.filter(l =>
    filtraPerData(l.Data, filtroLezioni, filtroLezioniData)
  );
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
  const totalePagine = Math.max(
    1,
    Math.ceil(lezioniFiltrate.length / RIGHE_PER_PAGINA)
  );

  if (paginaLezioni > totalePagine) {
    paginaLezioni = totalePagine;
  }

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
        const prenotati = prenotazioniData.filter(p =>
          String(p.ID_Lezione) === String(l.ID_Lezione)
        ).length;

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
            <td>${safe((l.Ora || "").substring(0, 5))}</td>
            <td>${tipologiaConStato}</td>
            <td>${safe(l.Istruttore)}</td>
            <td>${safe(l.Max_Partecipanti)}</td>
            <td>${prenotati}</td>
            <td>${rimasti}</td>
            <td>
              <button onclick="mostraDettaglioLezione('${escapeQuote(l.ID_Lezione)}')">🔎 Dettaglio</button>
              <button onclick="mostraDettaglioLezione('${escapeQuote(l.ID_Lezione)}')">📅 Prenota</button>
              <button onclick="mostraPrenotazioniLezione('${escapeQuote(l.ID_Lezione)}')">🧑‍🤝‍🧑 Lista</button>
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
    if (typeof renderLezioniMobileSafe === "function") {
      renderLezioniMobileSafe();
    }
  }, 50);
}

function paginaLezioniPrecedente() {
  if (paginaLezioni > 1) {
    paginaLezioni--;
    renderLezioni();
  }
}

function paginaLezioniSuccessiva() {
  const totalePagine = Math.max(
    1,
    Math.ceil(getLezioniFiltrate().length / RIGHE_PER_PAGINA)
  );

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
          ${safe(l.Data)} ${safe((l.Ora || "").substring(0, 5))} - ${safe(l.Tipologia)}
          (${prenotati}/${max})
          ${piena ? "🔴 PIENA" : ""}
        </option>
      `;
    }).join("");

  if (valoreCorrente) {
    sel.value = valoreCorrente;
  }

  if (typeof aggiornaPacchettiPrenotazione === "function") {
    aggiornaPacchettiPrenotazione();
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

    if (typeof loadPrenotazioni === "function") {
      await loadPrenotazioni();
    }

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

    if (typeof loadPrenotazioni === "function") {
      await loadPrenotazioni();
    }

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
