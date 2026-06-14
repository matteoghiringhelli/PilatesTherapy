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
// LOGIN / LOGOUT
// ---------------------------
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

// ---------------------------
// CHECK SESSION
// ---------------------------
async function checkSession() {
  const isDashboard = window.location.pathname.includes("dashboard.html");

  if (!isDashboard) return;

  const { data } = await supabaseClient.auth.getSession();

  if (!data?.session) {
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
    console.error(error);
    status.innerText = "Errore caricamento ❌";
    return;
  }

  if (!data || data.length === 0) {
    status.innerText = "Nessun cliente presente";
    return;
  }

  status.innerText = `Clienti caricati ✅ (${data.length})`;

  output.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>Cognome</th>
          <th>Telefono</th>
          <th>Email</th>
          <th>Azioni</th>
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
            <td>
              <button onclick="modificaCliente('${c.ID_Cliente}')">Modifica</button>
              <button onclick="eliminaCliente('${c.ID_Cliente}')">Elimina</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// ---------------------------
// AGGIUNGI CLIENTE
// ---------------------------
async function aggiungiCliente() {

  const nome = document.getElementById("new_nome").value;
  const cognome = document.getElementById("new_cognome").value;
  const telefono = document.getElementById("new_telefono").value;
  const email = document.getElementById("new_email").value;

  if (!nome || !cognome) {
    alert("Nome e Cognome obbligatori");
    return;
  }

  const nuovoID = "CL" + Date.now();

  const { error } = await supabaseClient
    .from("clienti")
    .insert([
      {
        ID_Cliente: nuovoID,
        Nome: nome,
        Cognome: cognome,
        Telefono: telefono,
        Email: email,
        Data_Registrazione: new Date().toISOString().split("T")[0]
      }
    ]);

  if (error) {
    console.error(error);
    alert("Errore salvataggio ❌");
    return;
  }

  alert("Cliente salvato ✅");

  document.getElementById("new_nome").value = "";
  document.getElementById("new_cognome").value = "";
  document.getElementById("new_telefono").value = "";
  document.getElementById("new_email").value = "";

  loadClienti();
}

// ---------------------------
// ELIMINA CLIENTE
// ---------------------------
async function eliminaCliente(id) {

  const conferma = confirm("Vuoi eliminare questo cliente?");

  if (!conferma) return;

  const { error } = await supabaseClient
    .from("clienti")
    .delete()
    .eq("ID_Cliente", id);

  if (error) {
    console.error(error);
    alert("Errore eliminazione ❌");
    return;
  }

  alert("Cliente eliminato ✅");

  loadClienti();
}

// ---------------------------
// MODIFICA CLIENTE
// ---------------------------
async function modificaCliente(id) {

  const nuovoNome = prompt("Nuovo nome:");
  const nuovoCognome = prompt("Nuovo cognome:");

  if (!nuovoNome || !nuovoCognome) return;

  const { error } = await supabaseClient
    .from("clienti")
    .update({
      Nome: nuovoNome,
      Cognome: nuovoCognome
    })
    .eq("ID_Cliente", id);

  if (error) {
    console.error(error);
    alert("Errore modifica ❌");
    return;
  }

  alert("Cliente aggiornato ✅");

  loadClienti();
}

// ---------------------------
// START
// ---------------------------
checkSession();
