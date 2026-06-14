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

// ---------------------------
// LOGIN
// ---------------------------
async function login() {
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  const statusEl = document.getElementById("loginStatus");

  const email = emailEl ? emailEl.value.trim() : "";
  const password = passwordEl ? passwordEl.value : "";

  if (statusEl) statusEl.innerText = "Login in corso...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    if (statusEl) statusEl.innerText = "Errore login: " + error.message;
    return;
  }

  window.location.href = "/dashboard.html";
}

// ---------------------------
// LOGOUT
// ---------------------------
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

// ---------------------------
// CHECK SESSIONE
// ---------------------------
async function checkSession() {
  const isDashboard = window.location.pathname.includes("dashboard.html");
  if (!isDashboard) return;

  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data?.session) {
    window.location.href = "/index.html";
    return;
  }
}

// ---------------------------
// CLIENTI - LOAD
// ---------------------------
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
    return;
  }

  status && (status.innerText = `Clienti caricati ✅ (${data.length})`);

  output.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>Cognome</th>
          <th>Telefono</th>
          <th>Email</th>
          <th>Indirizzo</th>
          <th>Città</th>
          <th>CAP</th>
          <th>Codice Fiscale</th>
          <th>Data Registrazione</th>
          <th>Azioni</th>
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
            <td>
              <button onclick="modificaCliente('${c.ID_Cliente}')">Modifica</button>
              <button onclick="eliminaCliente('${c.ID_Cliente}')">Elimina</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// ---------------------------
// CLIENTI - AGGIUNGI
// ---------------------------
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

// ---------------------------
// CLIENTI - MODIFICA
// ---------------------------
async function modificaCliente(id) {
  const nuovoNome = prompt("Nuovo nome:");
  if (nuovoNome === null) return;

  const nuovoCognome = prompt("Nuovo cognome:");
  if (nuovoCognome === null) return;

  const { error } = await supabaseClient
    .from("clienti")
    .update({
      Nome: nuovoNome.trim(),
      Cognome: nuovoCognome.trim()
    })
    .eq("ID_Cliente", id);

  if (error) {
    console.error(error);
    alert("Errore modifica cliente ❌");
    return;
  }

  alert("Cliente aggiornato ✅");
  loadClienti();
}

// ---------------------------
// CLIENTI - ELIMINA
// ---------------------------
async function eliminaCliente(id) {
  const conferma = confirm("Vuoi eliminare questo cliente?");
  if (!conferma) return;

  const { error } = await supabaseClient
    .from("clienti")
    .delete()
    .eq("ID_Cliente", id);

  if (error) {
    console.error(error);
    alert("Errore eliminazione cliente ❌");
    return;
  }

  alert("Cliente eliminato ✅");
  loadClienti();
}

// ---------------------------
// LEZIONI - LOAD
// ---------------------------
async function loadLezioni() {
  const output = document.getElementById("outputLezioni");
  const status = document.getElementById("status");

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
    return;
  }

  status && (status.innerText = `Lezioni caricate ✅ (${data.length})`);

  output.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
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
}

// ---------------------------
// LEZIONI - AGGIUNGI
// ---------------------------
async function aggiungiLezione() {
  const dataLezione = document.getElementById("new_data")?.value || "";
  const oraLezione = document.getElementById("new_ora")?.value || "";
  const tipologia = document.getElementById("new_tipologia")?.value.trim() || "";
  const istruttore = document.getElementById("new_istruttore")?.value.trim() || "";
  const maxPartecipanti = document.getElementById("new_max")?.value || "";

  if (!dataLezione || !oraLezione) {
    alert("Data e Ora sono obbligatorie");
    return;
  }

  const nuovoID = "LEZ" + Date.now();

  const { error } = await supabaseClient
    .from("lezioni")
    .insert([
      {
        ID_Lezione: nuovoID,
        Data: dataLezione,
        Ora: oraLezione,
        Tipologia: tipologia,
        Istruttore: istruttore,
        Max_Partecipanti: maxPartecipanti ? parseInt(maxPartecipanti, 10) : null
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
    "new_istruttore",
    "new_max"
  ];

  idsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  loadLezioni();
}

// ---------------------------
// AUTO START
// ---------------------------
(async function initApp() {
  await checkSession();

  if (window.location.pathname.includes("dashboard.html")) {
    if (document.getElementById("outputClienti")) {
      loadClienti();
    }
    if (document.getElementById("outputLezioni")) {
      loadLezioni();
    }
  }
})();
``
