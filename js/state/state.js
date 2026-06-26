// ============================
// ✅ GLOBAL STATE CENTRALIZZATO
// ============================

window.state = {

  clienti: [],
  lezioni: [],
  prenotazioni: [],
  pacchetti: [],

  ui: {
    paginaLezioni: 1,
    paginaPrenotazioni: 1,
    filtroLezioni: "tutte",
    filtroPrenotazioni: "tutte",
    searchClienti: "",
    searchPrenotazioni: ""
  },

  calendario: {
    dataCorrente: null
  }

};
