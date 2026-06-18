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

window.onload = async () => {
  generaOrari();
  await reloadAll();
};

async function reloadAll(){
  await loadClienti();
  await loadLezioni();
  await loadPrenotazioni();
}

function generaOrari(){
  const sel = document.getElementById("new_ora");
  sel.innerHTML="";

  for(let h=7;h<=21;h++){
    for(let m of [0,30]){
      let val = String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
      let o = document.createElement("option");
      o.value=val;
      o.textContent=val;
      sel.appendChild(o);
    }
  }
}

function toggleClienti(){document.getElementById("clientiSection").classList.toggle("hidden")}
function toggleLezioni(){document.getElementById("lezioniSection").classList.toggle("hidden")}
function togglePrenotazioni(){document.getElementById("prenotazioniSection").classList.toggle("hidden")}

// -------- CLIENTI
async function loadClienti(){
  const {data} = await supabaseClient.from("clienti").select("*");
  clienti = data||[];

  document.getElementById("outputClienti").innerHTML = `
  <table>
  <tr>
  <th>ID</th>
  <th>Nome</th>
  <th>Cognome</th>
  <th>Azioni</th>
  </tr>

  ${clienti.map(c=>`
  <tr>
  <td>${c.ID_Cliente}</td>
  <td>${c.Nome}</td>
  <td>${c.Cognome}</td>
  <td>
  <button onclick="modificaCliente('${c.ID_Cliente}')">Modifica</button>
  <button onclick="eliminaCliente('${c.ID_Cliente}')">Elimina</button>
  </td>
  </tr>
  `).join("")}
  </table>`;

  document.getElementById("select_cliente").innerHTML =
    `<option></option>`+
    clienti.map(c=>`<option value="${c.ID_Cliente}">
    ${c.Nome} ${c.Cognome}</option>`).join("");
}

async function aggiungiCliente(){
  await supabaseClient.from("clienti").insert([{
    ID_Cliente:"CL"+Date.now(),
    Nome:new_nome.value,
    Cognome:new_cognome.value
  }]);
  reloadAll();
}

async function eliminaCliente(id){
  await supabaseClient.from("clienti").delete().eq("ID_Cliente",id);
  reloadAll();
}

async function modificaCliente(id){
  let nome = prompt("Nome");
  let cognome = prompt("Cognome");

  await supabaseClient.from("clienti")
    .update({Nome:nome,Cognome:cognome})
    .eq("ID_Cliente",id);

  reloadAll();
}

// -------- LEZIONI
async function loadLezioni(){
  const {data} = await supabaseClient.from("lezioni").select("*");
  lezioni = data||[];

  document.getElementById("outputLezioni").innerHTML=`
  <table>
  <tr>
  <th>Data</th>
  <th>Ora</th>
  <th>Prenotati</th>
  <th>Posti</th>
  </tr>

  ${lezioni.map(l=>{
    let p = prenotazioni.filter(x=>x.ID_Lezione==l.ID_Lezione).length;
    let r = l.Max_Partecipanti - p;

    return `
    <tr>
    <td>${l.Data}</td>
    <td>${l.Ora}</td>
    <td>${p}</td>
    <td>${r}</td>
    </tr>
    `;
  }).join("")}
  </table>`;

  document.getElementById("select_lezione").innerHTML=
    `<option></option>`+
    lezioni.map(l=>`<option value="${l.ID_Lezione}">
    ${l.Data} ${l.Ora} (${prenotazioni.filter(x=>x.ID_Lezione==l.ID_Lezione).length}/${l.Max_Partecipanti})
    </option>`).join("");
}

async function aggiungiLezione(){
  let tipo=new_tipologia.value;

  await supabaseClient.from("lezioni").insert([{
    ID_Lezione:"LEZ"+Date.now(),
    Data:new_data.value,
    Ora:new_ora.value,
    Tipologia:tipo,
    Istruttore:new_istruttore.value,
    Max_Partecipanti:MAX[tipo]
  }]);

  reloadAll();
}

// -------- PRENOTAZIONI
async function loadPrenotazioni(){
  const {data} = await supabaseClient.from("prenotazioni").select("*");
  prenotazioni=data||[];

  document.getElementById("outputPrenotazioni").innerHTML=`
  <table>
  <tr><th>Cliente</th><th>Lezione</th></tr>

  ${prenotazioni.map(p=>{
    let c=clienti.find(x=>x.ID_Cliente==p.ID_Cliente);
    let l=lezioni.find(x=>x.ID_Lezione==p.ID_Lezione);

    return `<tr>
    <td>${c?.Nome}</td>
    <td>${l?.Data} ${l?.Ora}</td>
    </tr>`;
  }).join("")}
  </table>`;
}

async function prenota(){

  let c=document.getElementById("select_cliente").value;
  let l=document.getElementById("select_lezione").value;

  if(!c||!l){
    alert("Seleziona");
    return;
  }

  let dup=prenotazioni.find(x=>x.ID_Cliente==c&&x.ID_Lezione==l);
  if(dup){
    alert("Già prenotato");
    return;
  }

  let count=prenotazioni.filter(x=>x.ID_Lezione==l).length;
  let lez=lezioni.find(x=>x.ID_Lezione==l);

  if(count>=lez.Max_Partecipanti){
    alert("Piena");
    return;
  }

  const {error}=await supabaseClient.from("prenotazioni").insert([{
    ID_Prenotazione:"PRE"+Date.now(),
    ID_Cliente:c,
    ID_Lezione:l
  }]);

  if(error){
    console.log(error);
    alert("Errore insert");
    return;
  }

  reloadAll();
}

// -------- AUTH
async function logout(){
  await supabaseClient.auth.signOut();
  window.location.href="/index.html";
}
