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

  // ✅ USA VARIABILI GLOBALI DIRETTE (NO window)
  contiData = data || [];
  contiDataOriginal = [...contiData];

  console.log("✅ Conti caricati:", contiData.length);

  renderConti();
  renderContiKpi();
}

// ============================
// ✅ FILTRI CONTI
// ============================

function applicaFiltroConti() {

  const meseFiltro = document.getElementById("contiFiltroMese")?.value || "";

  let filtered;

  if (!meseFiltro) {
    filtered = [...contiDataOriginal];
  } else {
    filtered = contiDataOriginal.filter(m => {
      if (!m.data) return false;
      return m.data.startsWith(meseFiltro);
    });
  }

  contiData = filtered;

  console.log("✅ Conti dopo filtro:", contiData.length);

  renderConti();
  renderContiKpi();
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
