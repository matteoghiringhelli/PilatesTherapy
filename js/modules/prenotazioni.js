// ============================
// ✅ MODULO PRENOTAZIONI CORE
// ============================

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
    return String(b.ID_Prenotazione || "").localeCompare(
      String(a.ID_Prenotazione || "")
    );
  });

  paginaPrenotazioni = 1;

  renderPrenotazioni();

  if (typeof renderLezioni === "function") {
    renderLezioni();
  }

  if (typeof renderSelectLezioni === "function") {
    renderSelectLezioni();
  }

  if (typeof renderCalendario === "function") {
    renderCalendario();
  }

  if (typeof aggiornaPacchettiPrenotazione === "function") {
    aggiornaPacchettiPrenotazione();
  }
}

function getPrenotazioniFiltrate() {
  return prenotazioniData.filter(p => {
    const lezione = lezioniData.find(l =>
      String(l.ID_Lezione) === String(p.ID_Lezione)
    );

    const dataLezione = lezione ? lezione.Data : "";

    return filtraPerData(
      dataLezione,
      filtroPrenotazioni,
      filtroPrenotazioniData
    );
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

  const totalePagine = Math.max(
    1,
    Math.ceil(prenotazioniFiltrate.length / RIGHE_PER_PAGINA)
  );

  if (paginaPrenotazioni > totalePagine) {
    paginaPrenotazioni = totalePagine;
  }

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
        const cliente = clientiData.find(c =>
          String(c.ID_Cliente) === String(p.ID_Cliente)
        );

        const lezione = lezioniData.find(l =>
          String(l.ID_Lezione) === String(p.ID_Lezione)
        );

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
            <td>${lezione ? safe((lezione.Ora || "").substring(0, 5)) : ""}</td>
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
    if (typeof renderPrenotazioniMobileSafe === "function") {
      renderPrenotazioniMobileSafe();
    }
  }, 50);
}

function paginaPrenotazioniPrecedente() {
  if (paginaPrenotazioni > 1) {
    paginaPrenotazioni--;
    renderPrenotazioni();
  }
}

function paginaPrenotazioniSuccessiva() {
  const totalePagine = Math.max(
    1,
    Math.ceil(getPrenotazioniFiltrate().length / RIGHE_PER_PAGINA)
  );

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

  const lezione = lezioniData.find(l =>
    String(l.ID_Lezione) === String(idLezione)
  );

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
    setStatus(
      "Il pacchetto selezionato non è compatibile con la tipologia della lezione",
      "err"
    );
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

  try {
    const data = await safeInsert("prenotazioni", {
      ID_Prenotazione: generaNuovoIdProgressivo(
        "PR",
        prenotazioniData,
        "ID_Prenotazione"
      ),
      ID_Cliente: idCliente,
      ID_Lezione: idLezione,
      ID_Pacchetto: idPacchetto
    });

    console.log("Risposta insert prenotazioni:", data);

    if (!data || !data.length) {
      setStatus(
        "Prenotazione non restituita da Supabase: controlla le policy RLS",
        "err"
      );
      return;
    }

    if (typeof ricordaSmartPrenotazione === "function") {
      ricordaSmartPrenotazione(idCliente, idLezione);
    }

    const selectCliente = document.getElementById("select_cliente");
    const selectLezione = document.getElementById("select_lezione");
    const selectPacchetto = document.getElementById("select_pacchetto");

    if (selectCliente) selectCliente.value = "";
    if (selectLezione) selectLezione.value = "";

    if (selectPacchetto) {
      selectPacchetto.innerHTML = `
        <option value="">Seleziona prima cliente e lezione</option>
      `;
    }

    await loadPrenotazioni();

    if (typeof loadPacchetti === "function") {
      await loadPacchetti();
    }

    const reportBox = document.getElementById("reportPacchettiBox");
    if (
      reportBox &&
      !reportBox.classList.contains("hidden") &&
      typeof renderReportPacchetti === "function"
    ) {
      renderReportPacchetti();
    }

    setStatus("Prenotazione salvata correttamente ✅", "ok");
  } catch (error) {
    console.error("Errore prenota:", error);
    setStatus("Errore salvataggio prenotazione", "err");
  }
}

async function eliminaPrenotazione(id) {
  if (!confirm("Eliminare prenotazione?")) return;

  try {
    await safeDelete("prenotazioni", { ID_Prenotazione: id });

    await loadPrenotazioni();

    if (typeof loadPacchetti === "function") {
      await loadPacchetti();
    }

    const reportBox = document.getElementById("reportPacchettiBox");
    if (
      reportBox &&
      !reportBox.classList.contains("hidden") &&
      typeof renderReportPacchetti === "function"
    ) {
      renderReportPacchetti();
    }

    setStatus("Prenotazione eliminata correttamente ✅", "ok");
  } catch (error) {
    console.error("Errore eliminaPrenotazione:", error);
    setStatus("Errore eliminazione prenotazione", "err");
  }
}

function mostraStoricoCliente(idCliente) {
  const out = document.getElementById("outputStoricoCliente");
  if (!out) return;

  const cliente = clientiData.find(c =>
    String(c.ID_Cliente) === String(idCliente)
  );

  if (!cliente) {
    out.innerHTML = `<p class="muted">Cliente non trovato.</p>`;
    return;
  }

  const storico = prenotazioniData
    .filter(p => String(p.ID_Cliente) === String(idCliente))
    .map(p => {
      const lezione = lezioniData.find(l =>
        String(l.ID_Lezione) === String(p.ID_Lezione)
      );

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
