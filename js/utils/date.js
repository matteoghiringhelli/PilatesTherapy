// ============================
// ✅ DATE UTILS
// ============================

function getTodayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateLocal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekRangeStrings() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: formatDateLocal(monday),
    end: formatDateLocal(sunday)
  };
}

function formatOraHHMM(value) {
  return String(value || "").substring(0, 5);
}

function formatDataEstesaIt(dateString) {
  if (!dateString) return "";

  const d = new Date(dateString + "T00:00:00");

  const giorni = [
    "Domenica",
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato"
  ];

  const mesi = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre"
  ];

  return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()}`;
}

function isDateInCurrentWeek(dateString) {
  if (!dateString) return false;

  const range = getWeekRangeStrings();
  return dateString >= range.start && dateString <= range.end;
}

function filtraPerData(dateString, tipoFiltro, dataSpecifica) {
  const oggi = getTodayString();

  if (tipoFiltro === "tutte") return true;
  if (!dateString) return false;

  if (tipoFiltro === "oggi") {
    return dateString === oggi;
  }

  if (tipoFiltro === "settimana") {
    return isDateInCurrentWeek(dateString);
  }

  if (tipoFiltro === "future") {
    return dateString >= oggi;
  }

  if (tipoFiltro === "passate") {
    return dateString < oggi;
  }

  if (tipoFiltro === "data") {
    return dateString === dataSpecifica;
  }

  return true;
}

function aggiungiMesiAData(dateString, mesi) {
  if (!dateString) return "";

  const d = new Date(`${dateString}T00:00:00`);
  d.setMonth(d.getMonth() + Number(mesi || 0));

  return formatDateLocal(d);
}

function getGiornoSettimanaIndex(dateString) {
  if (!dateString) return null;

  const d = new Date(dateString + "T00:00:00");
  return d.getDay();
}

function getMondayDate(dateString) {
  const d = new Date(dateString + "T00:00:00");
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diffToMonday);

  return d;
}

function getWeekKey(dateString) {
  if (!dateString) return "";
  return formatDateLocal(getMondayDate(dateString));
}

function getWeekLabel(weekKey) {
  if (!weekKey) return "";

  const start = new Date(weekKey + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${formatDateLocal(start)} → ${formatDateLocal(end)}`;
}

function getLabelMeseDashboard(meseKey) {
  if (!meseKey) return "";

  const mesi = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic"
  ];

  const parti = String(meseKey).split("-");
  const anno = parti[0] || "";
  const meseNumero = Number(parti[1] || 0);
  const nomeMese = mesi[meseNumero - 1] || meseKey;

  return `${nomeMese} ${anno}`;
}

function getLabelSettimanaDashboard(settimanaKey) {
  if (!settimanaKey) return "";

  const start = new Date(settimanaKey + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const giornoStart = String(start.getDate()).padStart(2, "0");
  const meseStart = String(start.getMonth() + 1).padStart(2, "0");
  const giornoEnd = String(end.getDate()).padStart(2, "0");
  const meseEnd = String(end.getMonth() + 1).padStart(2, "0");

  return `${giornoStart}/${meseStart} - ${giornoEnd}/${meseEnd}`;
}

window.PTDateUtils = {
  getTodayString,
  formatDateLocal,
  getWeekRangeStrings,
  formatOraHHMM,
  formatDataEstesaIt,
  isDateInCurrentWeek,
  filtraPerData,
  aggiungiMesiAData,
  getGiornoSettimanaIndex,
  getMondayDate,
  getWeekKey,
  getWeekLabel,
  getLabelMeseDashboard,
  getLabelSettimanaDashboard
};
