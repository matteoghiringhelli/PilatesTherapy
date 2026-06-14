const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";


const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

// ===========================
// AUTH
// ===========================
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

// ===========================
// TOGGLE SEZIONI
// ===========================
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

// ===========================
// ORARI LEZIONI (07:00-21:00 ogni 30 minuti)
// ===========================
function popolaOrari() {
  const selectOra = document.getElementById("new_ora");
  if (!selectOra) return;

  selectOra.innerHTML = `<option value="">Ora</option>`;

  for (let hour = 7; hour <= 21; hour++) {
    for (let minute of [0, 30]) {
      if (hour === 21 && minute === 30) continue; // stop a 21:00
      const hh = String(hour).padStart(2, "0");
      const mm = String(minute).padStart(2, "0");
      const value = `${hh}:${mm}`;
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      selectOra.appendChild(opt);
    }
  }
}

// ===========================
// UTILITY MAX PARTECIPANTI
// ===========================
function getMaxPartecipantiByTipologia(tipologia) {
  if (tipologia === "Privata") return 1;
  if (tipologia === "Duetto") return 2;
  if (tipologia === "Mini-Gruppo") return 3;
  return null;
}

// ===========================
// CLIENTI - LOAD
// ===========================
async function loadClienti() {
  const status = document.getElementById("status");
  const output = document.getElementById("outputClienti");

  if (!output) return;

  status && (status.innerText = "Caricamento clienti...");

  const { data, error } = await supabaseClient
    .from("clienti")
    .select("*")
    .order("Cognome", { ascending: true });

  if (error) {
    console.error(error);
    status && (status.innerText = "Errore caricamento clienti ❌");
    return;
  }

  if (!data || data.length === 0) {
    status && (status.innerText = "Nessun cliente presente");
    output.innerHTML = "";
    document.getElementById("select_cliente").innerHTML = "";
    return;
  }

  status && (status.innerText = `Clienti caricati ✅ (${data.length})`);

  output.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID Cliente</th>
          <th>Nome</th>
          <th>Cognome</th>
          <th>Telefono</th>
          <th>Email</th>
          <th>Indirizzo</th>
          <th>Città</th>
          <th>CAP</th>
          <th>Codice Fiscale</th>
          <th>Data Registrazione</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(c => `
          <tr>
            <td>${c.ID_Cliente || ""}</td>
            <td>${c.Nome || ""}</td>
            <td>${c.Cognome || ""}</td>
            <td>${c.Telefono || ""}</td>
            <td>${c.Email || ""}</td>
            <td>${c.Indirizzo || ""}</td>
            <td>${c["Cittá"] || ""}</td>
            <td>${c.CAP || ""}</td>
            <td>${c.Codice_Fiscale || ""}</td>
            <td>${c.Data_Registrazione || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  // dropdown clienti
  document.getElementById("select_cliente").innerHTML =
    data.map(c => `
      <option value="${c.ID_Cliente}">
        ${c.Nome} ${c.Cognome}
      </option>
    `).join("");
}

// ===========================
// CLIENTI - AGGIUNGI
// ===========================
async function aggiungiCliente() {
  const nome = document.getElementById("new_nome")?.value.trim() || "";
  const cognome = document.getElementById("new_cognome")?.value.trim() || "";
  const telefono = document.getElementById("new_telefono")?.value.trim() || "";
  const email = document.getElementById("new_email")?.value.trim() || "";
  const indirizzo = document.getElementById("new_indirizzo")?.value.trim() || "";
  const citta = document.getElementById("new_citta")?.value.trim() || "";
  const cap = document.getElementById("new_cap")?.value.trim() || "";
  const codiceFiscale = document.getElementById("new_cf")?.value.trim() || "";

  if (!nome || !cognome) {
    alert("Nome e Cognome obbligatori");
    return;
  }

  const nuovoID = "CL" + Date.now();

  const { error } = await supabaseClient
    .from("clienti")
    .insert([
      {
        ID_Cliente: nuovoID,
        Nome: nome,
        Cognome: cognome,
        Telefono: telefono,
        Email: email,
        Indirizzo: indirizzo,
        "Cittá": citta,
        CAP: cap,
        Codice_Fiscale: codiceFiscale,
        Data_Registrazione: new Date().toISOString().split("T")[0]
      }
    ]);

  if (error) {
    console.error(error);
    alert("Errore salvataggio cliente ❌");
    return;
  }

  alert("Cliente salvato ✅");

  const idsToClear = [
    "new_nome",
    "new_cognome",
    "new_telefono",
    "new_email",
    "new_indirizzo",
    "new_citta",
    "new_cap",
    "new_cf"
  ];

  idsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  loadClienti();
}

// ===========================
// LEZIONI - LOAD
// ===========================
async function loadLezioni() {
  const status = document.getElementById("status");
  const output = document.getElementById("outputLezioni");

  if (!output) return;

  status && (status.innerText = "Caricamento lezioni...");

  const { data, error } = await supabaseClient
    .from("lezioni")
    .select("*")
    .order("Data", { ascending: true })
    .order("Ora", { ascending: true });

  if (error) {
    console.error(error);
    status && (status.innerText = "Errore caricamento lezioni ❌");
    return;
  }

  if (!data || data.length === 0) {
    status && (status.innerText = "Nessuna lezione presente");
    output.innerHTML = "";
    document.getElementById("select_lezione").innerHTML = "";
    return;
  }

  status && (status.innerText = `Lezioni caricate ✅ (${data.length})`);

  output.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID Lezione</th>
          <th>Data</th>
          <th>Ora</th>
          <th>Tipologia</th>
          <th>Istruttore</th>
          <th>Max Partecipanti</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(l => `
          <tr>
            <td>${l.ID_Lezione || ""}</td>
            <td>${l.Data || ""}</td>
            <td>${l.Ora || ""}</td>
            <td>${l.Tipologia || ""}</td>
            <td>${l.Istruttore || ""}</td>
            <td>${l.Max_Partecipanti || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  // dropdown lezioni
  document.getElementById("select_lezione").innerHTML =
    data.map(l => `
      <option value="${l.ID_Lezione}">
        ${l.Data} ${l.Ora} - ${l.Tipologia} (${l.Istruttore || "n/d"})
      </option>
    `).join("");
}

// ===========================
// LEZIONI - AGGIUNGI
// ===========================
async function aggiungiLezione() {
  const dataLezione = document.getElementById("new_data")?.value || "";
  const oraLezione = document.getElementById("new_ora")?.value || "";
  const tipologia = document.getElementById("new_tipologia")?.value || "";
  const istruttore = document.getElementById("new_istruttore")?.value.trim() || "";

  if (!dataLezione || !oraLezione || !tipologia || !istruttore) {
    alert("Data, Ora, Tipologia e Istruttore sono obbligatori");
    return;
  }

  const nuovoID = "LEZ" + Date.now();
  const maxPartecipanti = getMaxPartecipantiByTipologia(tipologia);

  const { error } = await supabaseClient
    .from("lezioni")
    .insert([
      {
        ID_Lezione: nuovoID,
        Data: dataLezione,
        Ora: oraLezione,
        Tipologia: tipologia,
        Istruttore: istruttore,
        Max_Partecipanti: maxPartecipanti
      }
    ]);

  if (error) {
    console.error(error);
    alert("Errore salvataggio lezione ❌");
    return;
  }

  alert("Lezione salvata ✅");

  const idsToClear = [
    "new_data",
    "new_ora",
    "new_tipologia",
    "new_istruttore"
  ];

  idsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  loadLezioni();
}

// ===========================
// PRENOTAZIONI
// ===========================
async function prenota() {
  const idCliente = document.getElementById("select_cliente")?.value || "";
  const idLezione = document.getElementById("select_lezione")?.value || "";

  if (!idCliente || !idLezione) {
    alert("Seleziona cliente e lezione");
    return;
  }

  const nuovoID = "PRE" + Date.now();

  const { error } = await supabaseClient
    .from("prenotazioni")
    .insert([
      {
        ID_Prenotazione: nuovoID,
        ID_Cliente: idCliente,
        ID_Lezione: idLezione
      }
    ]);

  if (error) {
    console.error(error);
    alert("Errore prenotazione ❌");
    return;
  }

  alert("Prenotazione salvata ✅");
}

// ===========================
// AVVIO
// ===========================
(function initApp() {
  popolaOrari();
  loadClienti();
  loadLezioni();
})();
