// ============================
// ✅ MODULO CLIENTI
// ============================

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

    return (
      full.includes(searchClienti) ||
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
    if (typeof renderClientiMobileSafe === "function") {
      renderClientiMobileSafe();
    }
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

  if (typeof aggiornaPacchettiPrenotazione === "function") {
    aggiornaPacchettiPrenotazione();
  }
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

  try {
    await safeInsert("clienti", payload);

    pulisciFormCliente();

    const nuovoClienteBox = document.getElementById("nuovoClienteBox");
    if (nuovoClienteBox) {
      nuovoClienteBox.classList.add("hidden");
    }

    await loadClienti();

    setStatus("Cliente salvato correttamente ✅", "ok");
  } catch (error) {
    console.error("Errore aggiungiCliente:", error);
    setStatus("Errore salvataggio cliente", "err");
  }
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

  try {
    await safeUpdate(
      "clienti",
      {
        Nome,
        Cognome,
        Telefono,
        Email,
        Indirizzo,
        Cittá,
        CAP,
        Codice_Fiscale
      },
      { ID_Cliente: id }
    );

    await loadClienti();

    if (typeof loadPrenotazioni === "function") {
      await loadPrenotazioni();
    }

    if (typeof mostraSchedaCliente === "function") {
      mostraSchedaCliente(id);
    }

    setStatus("Cliente modificato correttamente ✅", "ok");
  } catch (error) {
    console.error("Errore modificaCliente:", error);
    setStatus("Errore modifica cliente", "err");
  }
}

async function eliminaCliente(id) {
  if (!confirm("Eliminare cliente?")) return;

  try {
    await safeDelete("clienti", { ID_Cliente: id });

    await loadClienti();

    if (typeof loadPrenotazioni === "function") {
      await loadPrenotazioni();
    }

    setStatus("Cliente eliminato correttamente ✅", "ok");
  } catch (error) {
    console.error("Errore eliminaCliente:", error);
    setStatus("Errore eliminazione cliente", "err");
  }
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
