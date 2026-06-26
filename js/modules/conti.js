// ============================
// ✅ MODULO CONTI STUDIO — BASE
// ============================

// ✅ Stato condiviso
// ✅ usa variabili globali già definite in app.js
// NON ridefinire qui (evita duplicazione)

// ============================
// ✅ LOAD CONTI
// ============================

async function loadConti() {

  const { data, error } = await fetchAllRows(
    "studio_act",
    "*",
    "id_movimento",
    false
  );

  if (error) {
    console.error("Errore loadConti:", error);
    setStatus(`Errore caricamento conti: ${error.message}`, "err");
    return;
  }

  // ✅ unica fonte di verità: window
  window.contiData = data || [];
  window.contiDataOriginal = [...window.contiData];

  // ✅ sync locale (lettura, NON scrittura duplicata)
  contiData = window.contiData;
  contiDataOriginal = window.contiDataOriginal;

  console.log("✅ Conti caricati:", contiData.length);

  applicaFiltroConti();

}

// ============================
// ✅ FILTRI CONTI
// ============================

function applicaFiltroConti() {

  let filtered = [...window.contiDataOriginal];

  if (window.filtroConti === "entrate") {
    filtered = filtered.filter(r => Number(r.importo || 0) > 0);
  }

  if (window.filtroConti === "uscite") {
    filtered = filtered.filter(r => Number(r.importo || 0) < 0);
  }

  if (window.filtroContiMese) {
    filtered = filtered.filter(r => {
      if (!r.Data) return false;
      return String(r.Data).startsWith(window.filtroContiMese);
    });
  }

  window.contiData = filtered;
  contiData = window.contiData;

  renderConti();

}

function setFiltroConti(tipo) {
  window.filtroConti = tipo;
  applicaFiltroConti();
}

function setFiltroContiMese() {
  const input = document.getElementById("filtro_conti_mese");
  window.filtroContiMese = input ? input.value : "";
  applicaFiltroConti();
}

function resetFiltroConti() {

  window.filtroConti = "tutti";
  window.filtroContiMese = "";

  const input = document.getElementById("filtro_conti_mese");
  if (input) input.value = "";

  window.contiData = [...window.contiDataOriginal];

  renderConti();

}
