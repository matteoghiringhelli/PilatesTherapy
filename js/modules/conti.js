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

  console.log("📅 filtro mese:", meseFiltro);
  console.log("📊 original:", contiDataOriginal?.length);

  if (!contiDataOriginal || !contiDataOriginal.length) {
    contiData = [];
    renderConti();
    renderContiKpi();
    return;
  }

  if (!meseFiltro) {
    contiData = [...contiDataOriginal];
  } else {

    contiData = contiDataOriginal.filter(m => {

      // ✅ FIX CRITICO: compatibilità campi
      const data = m.data || m.Data || "";

      if (!data) return false;

      // ✅ uniforma formato YYYY-MM-DD
      return String(data).startsWith(meseFiltro);

    });
  }

  console.log("✅ dopo filtro:", contiData.length);

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
