const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";

// ✅ inizializzazione corretta browser
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// -------------------
// LOGIN
// -------------------
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    alert("Errore login: " + error.message);
    return;
  }

  // redirect
  window.location.href = "/dashboard.html";
}

// -------------------
// LOAD CLIENTI
// -------------------
async function loadClienti() {
  const status = document.getElementById("status");
  const output = document.getElementById("output");

  status.innerText = "Caricamento...";

  const { data, error } = await supabaseClient
    .from("clienti")
    .select("*");

  if (error) {
    console.error(error);
    status.innerText = "Errore caricamento ❌";
    return;
  }

  if (!data || data.length === 0) {
    status.innerText = "Nessun cliente presente";
    return;
  }

  status.innerText = "Dati caricati ✅";

  output.innerHTML = data
    .map(c => `<p>${c.Nome} ${c.Cognome}</p>`)
    .join("");
}
