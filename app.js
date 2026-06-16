const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const MAX_PARTECIPANTI = {
  "Privata": 1,
  "Duetto": 2,
  "Mini-Gruppo": 4
};

let clientiData = [];
let lezioniData = [];
let prenotazioniData = [];

// ---------------- INIT ----------------
window.addEventListener("DOMContentLoaded", async () => {
  generaOrari();
  await loadAll();
});

async function loadAll() {
  await loadClienti();
  await loadLezioni();
  await loadPrenotazioni();
}

// ---------------- ORARI ----------------
function generaOrari() {
  const select = document.getElementById("new_ora");
  if (!select) return;

  select.innerHTML = "<option value=''>Ora</option>";

  for (let h = 7; h <= 21; h++) {
    for (let m of [0, 30]) {
      let ora = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");

      let opt = document.createElement("option");
      opt.value = ora;
      opt.textContent = ora;

      select.appendChild(opt);
    }
  }
}

// ---------------- TOGGLE ----------------
function toggleClienti() {
  document.getElementById("clientiSection")?.classList.toggle("hidden");
}

function toggleLezioni() {
  document.getElementById("lezioniSection")?.classList.toggle("hidden");
}

// ✅ FIX QUI
function togglePrenotazioni() {
  const el = document.getElementById("prenotazioniSection");
  if (!el) {
    console.error("Elemento prenotazioniSection NON trovato");
    return;
  }
  el.classList.toggle("hidden");
}

// ---------------- CLIENTI ----------------
async function loadClienti() {
  const { data } = await supabaseClient.from("clienti").select("*");
  clientiData = data || [];

  renderClienti();
  renderSelectClienti();
}

function renderClienti() {
  document.getElementById("outputClienti").innerHTML =
    `<table>
