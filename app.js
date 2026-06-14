const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";


const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true
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
// TOGGLE
// ===========================
function toggleClienti() {
  const el = document.getElementById("clientiSection");
  el.classList.toggle("hidden");
}

function toggleLezioni() {
  const el = document.getElementById("lezioniSection");
  el.classList.toggle("hidden");
}

// ===========================
// ORARI AUTOMATICI (07:00 - 21:00)
// ===========================
function popolaOrari() {
  const select = document.getElementById("new_ora");
  if (!select) return;

  select.innerHTML = `<option value="">Ora</option>`;

  for (let h = 7; h <= 21; h++) {
    for (let m of [0, 30]) {

      if (h === 21 && m === 30) continue;

      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const ora = `${hh}:${mm}`;

      const opt = document.createElement("option");
      opt.value = ora;
      opt.textContent = ora;

      select.appendChild(opt);
    }
  }
}

// ===========================
// MAX PARTECIPANTI
// ===========================
function getMaxPartecipanti(tipologia) {

  if (tipologia === "Privata") return 1;
  if (tipologia === "Duetto") return 2;
  if (tipologia === "Mini-Gruppo") return 4; // ✅ CAMBIATO QUI

  return null;
}

// ===========================
// CLIENTI
// ===========================
async function loadClienti() {

  const { data } = await supabaseClient.from("clienti").select("*");

  document.getElementById("outputClienti").innerHTML = `
    <table>
      <tr>
        <th>ID</th>
        <th>Nome</th>
        <th>Cognome</th>
        <th>Telefono</th>
        <th>Email</th>
        <th>Indirizzo</th>
        <th>Città</th>
        <th>CAP</th>
        <th>CF</th>
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
        </tr>
      `).join("")}
    </table>
  `;

  document.getElementById("select_cliente").innerHTML =
    data.map(c => `
      <option value="${c.ID_Cliente}">
        ${c.Nome} ${c.Cognome}
      </option>
    `).join("");
}

// ===========================
// AGGIUNGI CLIENTE
// ===========================
async function aggiungiCliente() {

  const nuovoID = "CL" + Date.now();

  await supabaseClient.from("clienti").insert([{
    ID_Cliente: nuovoID,
    Nome: document.getElementById("new_nome").value,
    Cognome: document.getElementById("new_cognome").value,
    Telefono: document.getElementById("new_telefono").value,
    Email: document.getElementById("new_email").value,
    Data_Registrazione: new Date().toISOString().split("T")[0]
  }]);

  loadClienti();
}

// ===========================
// LEZIONI
// ===========================
async function loadLezioni() {

  const { data } = await supabaseClient.from("lezioni").select("*");

  document.getElementById("outputLezioni").innerHTML = `
    <table>
      <tr>
        <th>ID</th>
        <th>Data</th>
        <th>Ora</th>
        <th>Tipologia</th>
        <th>Istruttore</th>
        <th>Max</th>
      </tr>
      ${data.map(l => `
        <tr>
          <td>${l.ID_Lezione}</td>
          <td>${l.Data}</td>
          <td>${l.Ora}</td>
          <td>${l.Tipologia}</td>
          <td>${l.Istruttore}</td>
          <td>${l.Max_Partecipanti}</td>
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

// ===========================
// AGGIUNGI LEZIONE
// ===========================
async function aggiungiLezione() {

  const data = document.getElementById("new_data").value;
  const ora = document.getElementById("new_ora").value;
  const tipologia = document.getElementById("new_tipologia").value;
  const istruttore = document.getElementById("new_istruttore").value;

  const nuovoID = "LEZ" + Date.now();

  const max = getMaxPartecipanti(tipologia);

  await supabaseClient.from("lezioni").insert([{
    ID_Lezione: nuovoID,
    Data: data,
    Ora: ora,
    Tipologia: tipologia,
    Istruttore: istruttore,
    Max_Partecipanti: max
  }]);

  alert("Lezione salvata ✅");

  loadLezioni();
}

// ===========================
// PRENOTAZIONI
// ===========================
async function prenota() {

  const nuovoID = "PRE" + Date.now();

  await supabaseClient.from("prenotazioni").insert([{
    ID_Prenotazione: nuovoID,
    ID_Cliente: document.getElementById("select_cliente").value,
    ID_Lezione: document.getElementById("select_lezione").value
  }]);

  alert("Prenotazione salvata ✅");
}

// ===========================
// START
// ===========================
(function init() {
  popolaOrari();
  loadClienti();
  loadLezioni();
})();
