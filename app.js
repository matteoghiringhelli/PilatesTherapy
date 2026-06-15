const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";


const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ---------------- CONFIG ----------------
const MAX_PARTECIPANTI = {
  "Privata": 1,
  "Duetto": 2,
  "Mini-Gruppo": 4
};

// ---------------- AUTH ----------------
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

// ---------------- INIT ----------------
window.onload = () => {
  generaOrari();
  loadClienti();
  loadLezioni();
};

// ---------------- ORARI ----------------
function generaOrari() {
  const select = document.getElementById("new_ora");
  select.innerHTML = "<option value=''>Ora</option>";

  for (let h = 7; h <= 21; h++) {
    for (let m of [0, 30]) {
      const ora =
        String(h).padStart(2, "0") + ":" +
        String(m).padStart(2, "0");

      const opt = document.createElement("option");
      opt.value = ora;
      opt.textContent = ora;

      select.appendChild(opt);
    }
  }
}

// ---------------- TOGGLE ----------------
function toggleClienti() {
  document.getElementById("clientiSection").classList.toggle("hidden");
}

function toggleLezioni() {
  document.getElementById("lezioniSection").classList.toggle("hidden");
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
    "<option value=''>Seleziona cliente</option>" +
    data.map(c => `
      <option value="${c.ID_Cliente}">
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
