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

  const { data } = await supabaseClient.from("clienti").select("*");

  document.getElementById("outputClienti").innerHTML = `
    <table>
      <tr>
        <th>Nome</th>
        <th>Cognome</th>
        <th>Telefono</th>
      </tr>
      ${data.map(c => `
        <tr>
          <td>${c.Nome || ""}</td>
          <td>${c.Cognome || ""}</td>
          <td>${c.Telefono || ""}</td>
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

// ---------------- LEZIONI ----------------
async function loadLezioni() {

  const { data } = await supabaseClient.from("lezioni").select("*");

  document.getElementById("outputLezioni").innerHTML = `
    <table>
      <tr>
        <th>Data</th>
        <th>Ora</th>
        <th>Tipologia</th>
      </tr>
      ${data.map(l => `
        <tr>
          <td>${l.Data}</td>
          <td>${l.Ora}</td>
          <td>${l.Tipologia || ""}</td>
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

// ---------------- START ----------------
loadClienti();
loadLezioni();
