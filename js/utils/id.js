// ============================
// ✅ ID UTILS
// ============================

function generaNuovoIdProgressivo(prefix, rows, fieldName) {
  const regex = new RegExp(`^${prefix}\\d{6}$`);

  const numeriValidi = (rows || [])
    .map(row => String(row[fieldName] || ""))
    .filter(id => regex.test(id))
    .map(id => Number(id.replace(prefix, "")))
    .filter(n => !Number.isNaN(n));

  const prossimoNumero = numeriValidi.length
    ? Math.max(...numeriValidi) + 1
    : 1;

  return prefix + String(prossimoNumero).padStart(6, "0");
}

function generaNuoviIdProgressivi(prefix, rows, fieldName, quantita) {
  const regex = new RegExp(`^${prefix}\\d{6}$`);

  const numeriValidi = (rows || [])
    .map(row => String(row[fieldName] || ""))
    .filter(id => regex.test(id))
    .map(id => Number(id.replace(prefix, "")))
    .filter(n => !Number.isNaN(n));

  const ultimoNumero = numeriValidi.length
    ? Math.max(...numeriValidi)
    : 0;

  return Array.from({ length: quantita }).map((_, index) => {
    return prefix + String(ultimoNumero + index + 1).padStart(6, "0");
  });
}

window.PTIdUtils = {
  generaNuovoIdProgressivo,
  generaNuoviIdProgressivi
};
