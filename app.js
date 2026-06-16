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

window.addEventListener("DOMContentLoaded", async () => {
  generaOrari();
  await loadClienti();
  await loadLezioni();
  await loadPrenotazioni();
});

// ---------------- ORARI
function generaOrari() {
  const select = document.getElementById("new_ora");
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

// ---------------- TOGGLE
function toggleClienti(){document.getElementById("clientiSection").classList.toggle("hidden")}
function toggleLezioni(){document.getElementById("lezioniSection").classList.toggle("hidden")}

// ---------------- CLIENTI
async function loadClienti(){
  const { data } = await supabaseClient.from("clienti").select("*");
  clienti = data;

  document.getElementById("outputClienti").innerHTML =
    `<table>
    <tr><th>Nome</th><th>Cognome</th></tr>
    ${data.map(c=>`<tr><td>${c.Nome}</td><td>${c.Cognome}</td></tr>`).join("")}
    </table>`;

  document.getElementById("select_cliente").innerHTML =
    `<option value="">Cliente</option>` +
    data.map(c=>`<option value="${c.ID_Cliente}">${c.Nome} ${c.Cognome}</option>`).join("");
}

async function aggiungiCliente(){
  await supabaseClient.from("clienti").insert([{
    ID_Cliente:"CL"+Date.now(),
    Nome:new_nome.value,
    Cognome:new_cognome.value
  }]);
  loadClienti();
}

// ---------------- LEZIONI
async function loadLezioni(){
  const { data } = await supabaseClient.from("lezioni").select("*");
  lezioni = data;

  document.getElementById("outputLezioni").innerHTML =
    `<table>
    <tr><th>Data</th><th>Ora</th><th>Prenotati</th><th>Posti</th></tr>
    ${data.map(l=>{
      let p = prenotazioni.filter(x=>x.ID_Lezione==l.ID_Lezione).length;
      let r = l.Max_Partecipanti - p;
      return `<tr><td>${l.Data}</td><td>${l.Ora}</td><td>${p}</td><td>${r}</td></tr>`;
    }).join("")}
    </table>`;

  document.getElementById("select_lezione").innerHTML =
    `<option value="">Lezione</option>` +
    data.map(l=>`<option value="${l.ID_Lezione}">${l.Data} ${l.Ora}</option>`).join("");
}

async function aggiungiLezione(){
  let tipo = new_tipologia.value;

  await supabaseClient.from("lezioni").insert([{
    ID_Lezione:"LEZ"+Date.now(),
    Data:new_data.value,
    Ora:new_ora.value,
    Tipologia:tipo,
    Istruttore:new_istruttore.value,
    Max_Partecipanti:MAX[tipo]
  }]);

  loadLezioni();
}

// ---------------- PRENOTAZIONI
async function loadPrenotazioni(){
  const { data } = await supabaseClient.from("prenotazioni").select("*");
  prenotazioni = data;

  document.getElementById("outputPrenotazioni").innerHTML =
    `<table>
    <tr><th>Cliente</th><th>Lezione</th></tr>
    ${data.map(p=>{
      let c = clienti.find(x=>x.ID_Cliente==p.ID_Cliente);
      let l = lezioni.find(x=>x.ID_Lezione==p.ID_Lezione);
      return `<tr><td>${c?.Nome}</td><td>${l?.Data} ${l?.Ora}</td></tr>`;
    }).join("")}
    </table>`;
}

async function prenota(){

  let c = select_cliente.value;
  let l = select_lezione.value;

  if(!c||!l)return alert("Seleziona");

  let dup = prenotazioni.find(x=>x.ID_Cliente==c && x.ID_Lezione==l);
  if(dup)return alert("Gia prenotato");

  let count = prenotazioni.filter(x=>x.ID_Lezione==l).length;
  let lec = lezioni.find(x=>x.ID_Lezione==l);

  if(count>=lec.Max_Partecipanti)return alert("Piena");

  await supabaseClient.from("prenotazioni").insert([{
    ID_Prenotazione:"PRE"+Date.now(),
    ID_Cliente:c,
    ID_Lezione:l
  }]);

  loadPrenotazioni();
}
