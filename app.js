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
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const status = document.getElementById("loginStatus");

  if (status) status.innerText = "Login in corso...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    if (status) status.innerText = "Errore login: " + error.message;
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
// CONTROLLO SESSIONE DASHBOARD
// ---------------------------
async function checkSession() {
  const isDashboard = window.location.pathname.includes("dashboard.html");

  if (!isDashboard) return;

  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data?.session) {
    window.location.href = "/index.html";
  }
}

// ---------------------------
// LOAD CLIENTI
// ---------------------------
async function loadClienti() {
  const status = document.getElementById("status");
  const output = document.getElementById("output");

  status.innerText = "Caricamento...";

  const { data, error } = await supabaseClient
    .from("clienti")
    .select("*");

  if (error) {
    status.innerText = "Errore caricamento ❌";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    status.innerText = "Nessun cliente presente";
    return;
  }

  status.innerText = `Dati caricati ✅ (${data.length})`;

  // ✅ render tabella pulita
  output.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>Cognome</th>
          <th>Telefono</th>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(c => `
          <tr>
            <td>${c.ID_Cliente}</td>
            <td>${c.Nome}</td>
            <td>${c.Cognome}</td>
            <td>${c.Telefono || ""}</td>
            <td>${c.Email || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// ---------------------------
// AUTO START
// ---------------------------
checkSession();
