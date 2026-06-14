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
  el.classList.toggle("hidden");
}

function toggleLezioni() {
  const el = document.getElementById("lezioniSection");
  el.classList.toggle("hidden");
}

// ---------------- CLIENTI ----------------
async function loadClienti() {

  const { data } = await supabaseClient.from("clienti").select("*");

  document.getElementById("outputClienti").innerHTML = `
    <table>
      <tr>
        <th>ID</th><th>Nome</th><th>Cognome</th>
        <th>Telefono</th><th>Email</th>
        <th>Azioni</th>
      </tr>

      ${data.map(c => `
        <tr>
          <td>${c.ID_Cliente}</td>
          <td>${c.Nome}</td>
          <td>${c.Cognome}</td>
          <td>${c.Telefono || ""}</td>
          <td>${c.Email || ""}</td>
          <td>
            <button onclick="modificaCliente('${c.ID_Cliente}')">Modifica</button>
            <button onclick="eliminaCliente('${c.ID_Cliente}')">Elimina</button>
          </td>
        </tr>
      `).join("")}
    </table>
  `;

  document.getElementById("select_cliente").innerHTML =
    data.map(c => `<option value="${c.ID_Cliente}">
      ${c.Nome} ${c.Cognome}
    </option>`).join("");
}

// ---------------- MODIFICA CLIENTE ----------------
async function modificaCliente(id) {

  const nome = prompt("Nuovo nome:");
  const cognome = prompt("Nuovo cognome:");

  if (!nome || !cognome) return;

  await supabaseClient
    .from("clienti")
    .update({ Nome: nome, Cognome: cognome })
    .eq("ID_Cliente", id);

  loadClienti();
}

// ---------------- ELIMINA CLIENTE ----------------
async function eliminaCliente(id) {

  if (!confirm("Eliminare cliente?")) return;

  await supabaseClient
    .from("clienti")
    .delete()
    .eq("ID_Cliente", id);

  loadClienti();
}

// ---------------- AGGIUNGI CLIENTE ----------------
async function aggiungiCliente() {

  const nuovoID = "CL" + Date.now();

  await supabaseClient.from("clienti").insert([{
    ID_Cliente: nuovoID,
    Nome: document.getElementById("new_nome").value,
    Cognome: document.getElementById("new_cognome").value,
    Data_Registrazione: new Date().toISOString().split("T")[0]
  }]);

  loadClienti();
}

// ---------------- LEZIONI ----------------
async function loadLezioni() {

  const { data } = await supabaseClient.from("lezioni").select("*");

  document.getElementById("outputLezioni").innerHTML = `
    <table>
      <tr>
        <th>ID</th><th>Data</th><th>Ora</th>
        <th>Tipologia</th><th>Istruttore</th><th>Max</th>
        <th>Azioni</th>
      </tr>

      ${data.map(l => `
        <tr>
          <td>${l.ID_Lezione}</td>
          <td>${l.Data}</td>
          <td>${l.Ora}</td>
          <td>${l.Tipologia}</td>
          <td>${l.Istruttore}</td>
          <td>${l.Max_Partecipanti}</td>
          <td>
            <button onclick="eliminaLezione('${l.ID_Lezione}')">Elimina</button>
          </td>
        </tr>
      `).join("")}
    </table>
  `;

  document.getElementById("select_lezione").innerHTML =
    data.map(l => `<option value="${l.ID_Lezione}">
      ${l.Data} ${l.Ora} - ${l.Tipologia}
    </option>`).join("");
}

// ---------------- ELIMINA LEZIONE ----------------
async function eliminaLezione(id) {

  if (!confirm("Eliminare lezione?")) return;

  await supabaseClient
    .from("lezioni")
    .delete()
    .eq("ID_Lezione", id);

  loadLezioni();
}

// ---------------- AGGIUNGI LEZIONE ----------------
async function aggiungiLezione() {

  const nuovoID = "LEZ" + Date.now();

  await supabaseClient.from("lezioni").insert([{
    ID_Lezione: nuovoID,
    Data: document.getElementById("new_data").value,
    Ora: document.getElementById("new_ora").value,
    Tipologia: document.getElementById("new_tipologia").value,
    Istruttore: document.getElementById("new_istruttore").value,
    Max_Partecipanti: 4
  }]);

  loadLezioni();
}

// ---------------- PRENOTAZIONI FIX ----------------
async function prenota() {

  const idCliente = document.getElementById("select_cliente").value;
  const idLezione = document.getElementById("select_lezione").value;

  const nuovoID = "PRE" + Date.now();

  const { error } = await supabaseClient
    .from("prenotazioni")
    .insert([{
      ID_Prenotazione: nuovoID,
      ID_Cliente: idCliente,
      ID_Lezione: idLezione
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
