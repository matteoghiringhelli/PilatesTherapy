// ============================
// ✅ GLOBAL STATE CENTRALIZZATO
// ============================

window.state = {
  clienti: [],
  lezioni: [],
  prenotazioni: [],
  pacchetti: [],
  conti: [],

  ui: {
    paginaLezioni: 1,
    paginaPrenotazioni: 1,

    filtroLezioni: "tutte",
    filtroLezioniData: "",

    filtroPrenotazioni: "tutte",
    filtroPrenotazioniData: "",

    searchClienti: "",
    searchPrenotazioni: "",

    reportPacchettiFiltro: "da_pagare",

    dettaglioLezioneBoxAttivo: "dettaglioLezioneBox"
  },

  calendario: {
    dataCorrente: getTodayString()
  },

  charts: {
    graficoRicaviSettimanaliInstance: null,
    graficoRicaviMensiliTipologiaInstance: null,
    chartFiscaleInstance: null
  }
};
