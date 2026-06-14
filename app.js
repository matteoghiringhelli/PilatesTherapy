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
// Utility HTML safe
// ---------------------------
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------------------------
// LOGIN
// ---------------------------
async function login() {
  const statusEl = document.getElementById("loginStatus");
  const email = document.getElementById("email")?.value?.trim();
  const password = document.getElementById("password")?.value ?? "";

  statusEl.innerText = "Login in corso...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    statusEl.innerText = "Errore login: " + error.message;
    return;
  }

  statusEl.innerText = "Login OK ✅";
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
// CHECK SESSIONE SU DASHBOARD
// ---------------------------
async function checkDashboardSession() {
  const isDashboard = window.location.pathname.includes("dashboard.html");
  if (!isDashboard) return;

  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data?.session) {
    window.location.href = "/index.html";
    return;
  }
}

// ---------------------------
// RENDER TABELLA DINAMICA
// ---------------------------
function renderTable(rows) {
  const output = document.getElementById("output");

  if (!rows || rows.length === 0) {
    output.innerHTML = "<p>Nessun dato presente.</p>";
    return;
  }

  const columns = Object.keys(rows[0]);

  const thead = `
    <thead>
      <tr>
        ${columns.map(col => `<th>${escapeHtml(col)}</th>`).join("")}
      </tr>
    </thead>
  `;

  const tbody = `
    <tbody>
      ${rows.map(row => `
        <tr>
          ${columns.map(col => `<td>${escapeHtml(row[col])}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;

  output.innerHTML = `<table>${thead}${tbody}</table>`;
}

// ---------------------------
// LOAD CLIENTI
// ---------------------------
async function loadClienti() {
  const status = document.getElementById("status");
  const debug = document.getElementById("debug");
  const output = document.getElementById("output");

  status.innerText = "Caricamento clienti...";
  debug.innerText = "";
  output.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("clienti")
    .select("*")
    .limit(50);

  if (error) {
    status.innerText = "Errore caricamento ❌";
    debug.innerText = "Errore Supabase:\n" + JSON.stringify(error, null, 2);
    return;
  }

  if (!data || data.length === 0) {
    status.innerText = "Nessun cliente presente";
    debug.innerText = "La query è andata a buon fine ma non ha restituito righe.";
    return;
  }

  const firstRow = data[0];
  const keys = Object.keys(firstRow);

  status.innerText = `Dati caricati ✅ (${data.length} righe)`;
  debug.innerText =
    "Colonne lette automaticamente dal database:\n" +
    keys.join(", ") +
    "\n\nPrima riga:\n" +
    JSON.stringify(firstRow, null, 2);

  renderTable(data);
}

// ---------------------------
// AUTO START
// ---------------------------
checkDashboardSession();
