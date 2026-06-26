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

  // ✅ SET CORRETTO
  window.contiData = data || [];
  window.contiDataOriginal = data ? [...data] : [];

  console.log("✅ Conti caricati:", window.contiData.length);

  // ✅ IMPORTANTISSIMO: NON usare contiData locale
  renderConti();
  renderContiKpi();
}

// ============================
// ✅ FILTRI CONTI
// ============================

function applicaFiltroConti() {

  const meseFiltro = document.getElementById("contiFiltroMese")?.value || "";

  const original = window.contiDataOriginal || [];

  // ✅ NON distruggere mai la source
  let filtered;

  if (!meseFiltro) {
    filtered = [...original];
  } else {
    filtered = original.filter(m => {
      if (!m.data) return false;
      return m.data.startsWith(meseFiltro);
    });
  }

  // ✅ CRITICO: aggiorna SEMPRE window
  window.contiData = filtered;

  console.log("✅ Conti dopo filtro:", window.contiData.length);

  // ✅ refresh UI
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
