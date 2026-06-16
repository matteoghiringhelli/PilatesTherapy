const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const MAX = {
  "Privata": 1,
  "Duetto": 2,
  "Mini-Gruppo": 4
};

let clienti = [];
let lezioni = [];
let prenotazioni = [];

// ---------------- INIT ----------------
window.addEventListener("DOMContentLoaded", async () => {
  generaOrari();
  await caricaTutto();
});

async function caricaTutto(){
  await loadClienti();
  await loadLezioni();
  await loadPrenotazioni();
}

// ---------------- ORARI ----------------
function generaOrari() {
  const select = document.getElementById("new_ora");
  if (!select) return;

  select.innerHTML = `<option value="">Ora</option>`;

  for (let h = 7; h <= 21; h++) {
    for (let m of [0, 30]) {
      let val = String(h).padStart(2,'0') + ":" + String(m).padStart(2,'0');

      let opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;

      select.appendChild(opt);
    }
  }
}

// ---------------- TOGGLE ----------------
function toggleClienti(){
  document.getElementById("clientiSection")?.classList.toggle("hidden");
}
function toggleLezioni(){
  document.getElementById("lezioniSection")?.classList.toggle("hidden");
}
function togglePrenotazioni(){
  document.getElementById("prenotazioniSection")?.classList.toggle("hidden");
}

// ---------------- CLIENTI ----------------
async function loadClienti(){
  const { data } = await supabaseClient.from("clienti").select("*");
  clienti = data || [];

  document.getElementById("outputClienti").innerHTML = `
    <table>
    <tr><th>Nome</th><th>Cognome</th></tr>
    ${clienti.map(c =>
      `<tr><td>${c.Nome}</td><td>${c.Cognome}</td></tr>`
    ).join("")}
    </table>`;

  document.getElementById("select_cliente").innerHTML =
    `<option value="">Cliente</option>` +
    clienti.map(c =>
      `<option value="${c.ID_Cliente}">
        ${c.Nome} ${c.Cognome}
      </option>`
    ).join("");
}

async function aggiungiCliente(){
  await supabaseClient.from("clienti").insert([{
    ID_Cliente: "CL"+Date.now(),
    Nome: document.getElementById("new_nome").value,
    Cognome: document.getElementById("new_cognome").value
  }]);

  loadClienti();
}

// ---------------- LEZIONI ----------------
async function loadLezioni(){
  const { data } = await supabaseClient.from("lezioni").select("*");
  lezioni = data || [];

  renderLezioni();

  document.getElementById("select_lezione").innerHTML =
    `<option value="">Lezione</option>` +
    lezioni.map(l =>
      `<option value="${l.ID_Lezione}">
        ${l.Data} ${l.Ora} (${contoPrenotazioni(l.ID_Lezione)}/${l.Max_Partecipanti})
      </option>`
    ).join("");
}

function renderLezioni(){
  document.getElementById("outputLezioni").innerHTML = `
    <table>
    <tr><th>Data</th><th>Ora</th><th>Prenotati</th><th>Posti</th></tr>

    ${lezioni.map(l=>{
      let pren = contoPrenotazioni(l.ID_Lezione);
      let rim = (l.Max_Partecipanti || 0) - pren;

      return `<tr>
        <td>${l.Data}</td>
        <td>${l.Ora}</td>
        <td>${pren}</td>
        <td>${rim}</td>
      </tr>`;
    }).join("")}

    </table>`;
}

function contoPrenotazioni(id){
  return prenotazioni.filter(p => p.ID_Lezione == id).length;
}

async function aggiungiLezione(){
  let tipo = document.getElementById("new_tipologia").value;

  await supabaseClient.from("lezioni").insert([{
    ID_Lezione:"LEZ"+Date.now(),
    Data:document.getElementById("new_data").value,
    Ora:document.getElementById("new_ora").value,
    Tipologia:tipo,
    Istruttore:document.getElementById("new_istruttore").value,
    Max_Partecipanti:MAX[tipo]
  }]);

  loadLezioni();
}

// ---------------- PRENOTAZIONI ----------------
async function loadPrenotazioni(){
  const { data } = await supabaseClient.from("prenotazioni").select("*");
  prenotazioni = data || [];

  renderPrenotazioni();
  renderLezioni(); // aggiorna posti
}

function renderPrenotazioni(){
  document.getElementById("outputPrenotazioni").innerHTML = `
    <table>
    <tr><th>Cliente</th><th>Lezione</th></tr>

    ${prenotazioni.map(p=>{
      let c = clienti.find(x=>x.ID_Cliente==p.ID_Cliente);
      let l = lezioni.find(x=>x.ID_Lezione==p.ID_Lezione);

      return `<tr>
        <td>${c?.Nome || ""}</td>
        <td>${l?.Data || ""} ${l?.Ora || ""}</td>
      </tr>`;
    }).join("")}

    </table>`;
}

// ✅ FIX PRENOTA
async function prenota(){

  let idCliente = document.getElementById("select_cliente").value;
  let idLezione = document.getElementById("select_lezione").value;

  if(!idCliente || !idLezione){
    return alert("Seleziona cliente e lezione");
  }

  // duplicato
  let duplicato = prenotazioni.find(p =>
    p.ID_Cliente == idCliente &&
    p.ID_Lezione == idLezione
  );

  if(duplicato){
    return alert("Prenotazione già esistente");
  }

  // capienza
  let count = contoPrenotazioni(idLezione);
  let lezione = lezioni.find(l => l.ID_Lezione == idLezione);

  if(count >= lezione.Max_Partecipanti){
    return alert("Lezione piena");
  }

  // insert
  const { error } = await supabaseClient
    .from("prenotazioni")
    .insert([{
      ID_Prenotazione:"PRE"+Date.now(),
      ID_Cliente:idCliente,
      ID_Lezione:idLezione
    }]);

  if(error){
    console.error(error);
    return alert("Errore salvataggio");
  }

  await loadPrenotazioni();
}

// ---------------- AUTH ----------------
async function logout(){
  await supabaseClient.auth.signOut();
  window.location.href="/index.html";
}
