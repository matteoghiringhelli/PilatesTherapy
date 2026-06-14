const SUPABASE_URL = "https://xxutsiiejegkgvlkgqrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXRzaWllamVna2d2bGtncXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTUxNjgsImV4cCI6MjA5NjgzMTE2OH0.EACUhY2OGCZVswkXdygd98I0yRMT5WQz_oNeHQgdhsU";


const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ---------------- LOGIN / SESSION ----------------
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

// ---------------- CLIENTI ----------------
async function loadClienti() {

  const { data } = await supabaseClient.from("clienti").select("*");

  document.getElementById("outputClienti").innerHTML = `
    <table>
      <tr><th>Nome</th><th>Cognome</th></tr>
      ${data.map(c => `<tr><td>${c.Nome}</td><td>${c.Cognome}</td></tr>`).join("")}
    </table>
  `;

  // dropdown clienti
  document.getElementById("select_cliente").innerHTML =
    data.map(c => `<option value="${c.ID_Cliente}">
      ${c.Nome} ${c.Cognome}
    </option>`).join("");

}


async function aggiungiCliente() {

  const nome = document.getElementById("new_nome").value;
  const cognome = document.getElementById("new_cognome").value;
  const telefono = document.getElementById("new_telefono").value;
  const email = document.getElementById("new_email").value;

  const nuovoID = "CL" + Date.now();

  await supabaseClient.from("clienti").insert([{
    ID_Cliente: nuovoID,
    Nome: nome,
    Cognome: cognome,
    Telefono: telefono,
    Email: email,
    Data_Registrazione: new Date().toISOString().split("T")[0]
  }]);

  loadClienti();
}


// ---------------- LEZIONI ----------------
async function loadLezioni() {

  const { data } = await supabaseClient.from("lezioni").select("*");

  document.getElementById("outputLezioni").innerHTML = `
    <table>
      <tr><th>Data</th><th>Ora</th><th>Tipologia</th></tr>
      ${data.map(l => `
        <tr>
          <td>${l.Data}</td>
          <td>${l.Ora}</td>
          <td>${l.Tipologia}</td>
        </tr>
      `).join("")}
    </table>
  `;

  // dropdown lezioni
  document.getElementById("select_lezione").innerHTML =
    data.map(l => `<option value="${l.ID_Lezione}">
      ${l.Data} ${l.Ora} - ${l.Tipologia}
    </option>`).join("");

}


async function aggiungiLezione() {

  const data = document.getElementById("new_data").value;
  const ora = document.getElementById("new_ora").value;
  const tipologia = document.getElementById("new_tipologia").value;

  const nuovoID = "LEZ" + Date.now();

  await supabaseClient.from("lezioni").insert([{
    ID_Lezione: nuovoID,
    Data: data,
    Ora: ora,
    Tipologia: tipologia
  }]);

  loadLezioni();
}


// ---------------- PRENOTAZIONI ----------------
async function prenota() {

  const idCliente = document.getElementById("select_cliente").value;
  const idLezione = document.getElementById("select_lezione").value;

  const nuovoID = "PRE" + Date.now();

  const { error } = await supabaseClient
    .from("prenotazioni")
    .insert([{
      ID_Prenotazione: nuovoID,
      ID_Cliente: idCliente,
      ID_Lezione: idLezione
    }]);

  if (error) {
    alert("Errore prenotazione");
    return;
  }

  alert("Prenotazione salvata ✅");

}


// ---------------- START ----------------
loadClienti();
loadLezioni();
