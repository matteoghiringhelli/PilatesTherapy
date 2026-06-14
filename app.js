const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";


const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ---------------- AUTH ----------------
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

// ---------------- TOGGLE ----------------
function toggleClienti() {
  const el = document.getElementById("clientiSection");
  el.style.display = (el.style.display === "none" || el.style.display === "") ? "block" : "none";
}

function toggleLezioni() {
  const el = document.getElementById("lezioniSection");
  el.style.display = (el.style.display === "none" || el.style.display === "") ? "block" : "none";
}

// ---------------- CLIENTI ----------------
async function loadClienti() {

  const { data, error } = await supabaseClient.from("clienti").select("*");

  if (error) {
    console.error(error);
    alert("Errore caricamento clienti");
    return;
  }

  document.getElementById("outputClienti").innerHTML = `
    <table>
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

      ${data.map(c => `
        <tr>
          <td>${c.ID_Cliente}</td>
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

// ---------------- AGGIUNGI CLIENTE ----------------
async function aggiungiCliente() {

  const nuovoID = "CL" + Date.now();

  const { error } = await supabaseClient.from("clienti").insert([{
    ID_Cliente: nuovoID,
    Nome: document.getElementById("new_nome").value,
    Cognome: document.getElementById("new_cognome").value,
    Telefono: document.getElementById("new_telefono").value,
    Email: document.getElementById("new_email").value,
    Indirizzo: document.getElementById("new_indirizzo").value,
    "Cittá": document.getElementById("new_citta").value,
    CAP: document.getElementById("new_cap").value,
    Codice_Fiscale: document.getElementById("new_cf").value,
    Data_Registrazione: new Date().toISOString().split("T")[0]
  }]);

  if (error) {
    console.error(error);
    alert("Errore salvataggio cliente");
    return;
  }

  alert("Cliente salvato ✅");

  loadClienti();
}

// ---------------- LEZIONI ----------------
async function loadLezioni() {

  const { data, error } = await supabaseClient.from("lezioni").select("*");

  if (error) {
    console.error(error);
    alert("Errore caricamento lezioni");
    return;
  }

  document.getElementById("outputLezioni").innerHTML = `
    <table>
      <tr>
        <th>ID Lezione</th>
        <th>Data</th>
        <th>Ora</th>
        <th>Tipologia</th>
        <th>Istruttore</th>
        <th>Max Partecipanti</th>
      </tr>

      ${data.map(l => `
        <tr>
          <td>${l.ID_Lezione}</td>
          <td>${l.Data}</td>
          <td>${l.Ora}</td>
          <td>${l.Tipologia || ""}</td>
          <td>${l.Istruttore || ""}</td>
          <td>${l.Max_Partecipanti || ""}</td>
        </tr>
      `).join("")}
    </table>
  `;

  document.getElementById("select_lezione").innerHTML =
    data.map(l => `
      <option value="${l.ID_Lezione}">
        ${l.Data} ${l.Ora} - ${l.Tipologia}
      </option>
    `).join("");
}

// ---------------- AGGIUNGI LEZIONE ----------------
async function aggiungiLezione() {

  const nuovoID = "LEZ" + Date.now();

  const { error } = await supabaseClient.from("lezioni").insert([{
    ID_Lezione: nuovoID,
    Data: document.getElementById("new_data").value,
    Ora: document.getElementById("new_ora").value,
    Tipologia: document.getElementById("new_tipologia").value,
    Istruttore: document.getElementById("new_istruttore").value,
    Max_Partecipanti: document.getElementById("new_max").value
  }]);

  if (error) {
    console.error(error);
    alert("Errore salvataggio lezione");
    return;
  }

  loadLezioni();
}

// ---------------- PRENOTAZIONI ----------------
async function prenota() {

  const nuovoID = "PRE" + Date.now();

  const { error } = await supabaseClient.from("prenotazioni").insert([{
    ID_Prenotazione: nuovoID,
    ID_Cliente: document.getElementById("select_cliente").value,
    ID_Lezione: document.getElementById("select_lezione").value
  }]);

  if (error) {
    console.error(error);
    alert("Errore prenotazione");
    return;
  }

  alert("Prenotazione salvata ✅");
}

// ---------------- START ----------------
loadClienti();
loadLezioni();
