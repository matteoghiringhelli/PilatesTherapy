// ============================
// ✅ FORMAT / TEXT UTILS
// ============================

function formatEuro(value) {
  const numero = Number(value || 0);

  return numero.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function formatNumeroIntero(value) {
  const numero = Number(value || 0);

  return numero.toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function safe(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeQuote(value) {
  if (value === null || value === undefined) return "";

  return String(value).replaceAll("'", "\\'");
}

function escapeAttr(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizzaTesto(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replace(/\s+/g, " ")
    .trim();
}

window.PTFormatUtils = {
  formatEuro,
  formatNumeroIntero,
  safe,
  escapeQuote,
  escapeAttr,
  normalizzaTesto
};
