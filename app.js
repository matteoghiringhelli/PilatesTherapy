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

