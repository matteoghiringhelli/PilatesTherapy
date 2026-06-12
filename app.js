
const supabase = supabase.createClient(
  "https://xxutsiiejegkgvlkgqrr.supabase.co/rest/v1/",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU"
);

// LOGIN
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Errore login");
  } else {
    window.location.href = "/dashboard.html";
  }
}

// CARICA CLIENTI
async function loadClienti() {
  const { data, error } = await supabase
    .from("clienti")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  const output = document.getElementById("output");

  output.innerHTML = data
    .map(c => `<p>${c.nome} ${c.cognome}</p>`)
    .join("");
}
