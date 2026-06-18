const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const MAX = {
  "Privata":1,
  "Duetto":2,
  "Mini-Gruppo":4
};

let clienti=[], lezioni=[], prenotazioni=[];

// INIT
window.onload = async ()=>{
  generaOrari();
  await reloadAll();
};

// ORARI
function generaOrari(){
  let sel = document.getElementById("new_ora");
  sel.innerHTML="";
  for(let h=7;h<=21;h++){
    for(let m of [0,30]){
      let val = String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
      let opt=document.createElement("option");
      opt.value=val; opt.textContent=val;
      sel.appendChild(opt);
    }
  }
}

// TOGGLE
function toggleClienti(){clientiSection.classList.toggle("hidden")}
function toggleLezioni(){lezioniSection.classList.toggle("hidden")}
function togglePrenotazioni(){prenotazioniSection.classList.toggle("hidden")}

// LOAD
async function reloadAll(){
  await loadClienti();
  await loadLezioni();
  await loadPrenotazioni();
}

// CLIENTI
async function loadClienti(){
  const {data} = await supabaseClient.from("clienti").select("*");
  clienti = data||[];

  outputClienti.innerHTML = `
  <table>
  <tr>
  <th>ID</th><th>Nome</th><th>Cognome</th>
  <th>Telefono</th><th>Email</th><th>Indirizzo</th>
  <th>Città</th><th>CAP</th><th>CF</th><th>Data</th>
  <th>Azioni</th>
  </tr>

  ${clienti.map(c=>`
  <tr>
  <td>${c.ID_Cliente}</td>
  <td>${c.Nome}</td>
  <td>${c.Cognome}</td>
  <td>${c.Telefono||""}</td>
  <td>${c.Email||""}</td>
  <td>${c.Indirizzo||""}</td>
  <td>${c.Cittá||""}</td>
  <td>${c.CAP||""}</td>
  <td>${c.Codice_Fiscale||""}</td>
  <td>${c.Data_Registrazione||""}</td>
  <td>
  <button onclick="modificaCliente('${c.ID_Cliente}')">Modifica</button>
  <button onclick="eliminaCliente('${c.ID_Cliente}')">Elimina</button>
  </td>
  </tr>
  `).join("")}
  </table>`;

  select_cliente.innerHTML="<option></option>"+clienti.map(c=>
    `<option value="${c.ID_Cliente}">${c.Nome} ${c.Cognome}</option>`
  ).join("");
}

async function aggiungiCliente(){
  await supabaseClient.from("clienti").insert([{
    ID_Cliente:"CL"+Date.now(),
    Nome:new_nome.value,
    Cognome:new_cognome.value,
    Data_Registrazione:new Date().toISOString().split("T")[0]
  }]);
  reloadAll();
}

async function eliminaCliente(id){
  await supabaseClient.from("clienti").delete().eq("ID_Cliente",id);
  reloadAll();
}

async function modificaCliente(id){
  let n=prompt("Nome");
  let c=prompt("Cognome");
  await supabaseClient.from("clienti")
    .update({Nome:n,Cognome:c})
    .eq("ID_Cliente",id);
  reloadAll();
}

// LEZIONI
async function loadLezioni(){
  const {data} = await supabaseClient.from("lezioni").select("*");
  lezioni = data||[];

  outputLezioni.innerHTML=`
  <table>
  <tr>
  <th>ID</th><th>Data</th><th>Ora</th>
  <th>Tipologia</th><th>Istruttore</th>
  <th>Max</th><th>Prenotati</th><th>Posti</th>
  </tr>

  ${lezioni.map(l=>{
    let p = prenotazioni.filter(x=>x.ID_Lezione==l.ID_Lezione).length;
    let r = l.Max_Partecipanti - p;

    return `<tr>
    <td>${l.ID_Lezione}</td>
    <td>${l.Data}</td>
    <td>${l.Ora}</td>
    <td>${l.Tipologia}</td>
    <td>${l.Istruttore}</td>
    <td>${l.Max_Partecipanti}</td>
    <td>${p}</td>
    <td>${r}</td>
    </tr>`;
  }).join("")}
  </table>`;

  select_lezione.innerHTML="<option></option>"+lezioni.map(l=>
    `<option value="${l.ID_Lezione}">
    ${l.Data} ${l.Ora} (${prenotazioni.filter(x=>x.ID_Lezione==l.ID_Lezione).length}/${l.Max_Partecipanti})
    </option>`
  ).join("");
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

// PRENOTAZIONI
async function loadPrenotazioni(){
  const {data} = await supabaseClient.from("prenotazioni").select("*");
  prenotazioni=data||[];

  outputPrenotazioni.innerHTML=`
  <table>
  <tr><th>ID</th><th>Cliente</th><th>Lezione</th></tr>

  ${prenotazioni.map(p=>{
    let c=clienti.find(x=>x.ID_Cliente==p.ID_Cliente);
    let l=lezioni.find(x=>x.ID_Lezione==p.ID_Lezione);

    return `<tr>
    <td>${p.ID_Prenotazione}</td>
    <td>${c?.Nome||""}</td>
    <td>${l?.Data||""} ${l?.Ora||""}</td>
    </tr>`;
  }).join("")}
  </table>`;
}

async function prenota(){

  let c = document.getElementById("select_cliente").value;
  let l = document.getElementById("select_lezione").value;

  console.log("Cliente:", c);
  console.log("Lezione:", l);

  if(!c || !l){
    alert("Seleziona cliente e lezione");
    return;
  }

  let dup = prenotazioni.find(x => 
    x.ID_Cliente == c && x.ID_Lezione == l
  );

  if(dup){
    alert("Già prenotato");
    return;
  }

  let count = prenotazioni.filter(x => x.ID_Lezione == l).length;
  let lez = lezioni.find(x => x.ID_Lezione == l);

  if(!lez){
    alert("Lezione non trovata");
    return;
  }

  if(count >= lez.Max_Partecipanti){
    alert("Lezione piena");
    return;
  }

const response = await supabaseClientconst response = await supabaseClientprenotazioni")
  .insert([{
    ID_Prenotazione: "PRE" + Date.now(),
    ID_Cliente: c,
    ID_Lezione: l
  }]);

console.log("RISPOSTA INSERT:", response);


  if(error){
    console.error("ERRORE SUPABASE:", error);
    alert("Errore insert - guarda console F12");
    return;
  }

  alert("Prenotazione salvata ✅");

  await reloadAll();
}


// AUTH
async function logout(){
  await supabaseClient.auth.signOut();
  window.location.href="/index.html";
}
