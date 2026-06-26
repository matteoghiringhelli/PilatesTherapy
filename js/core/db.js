// ============================
// ✅ SAFE DB HELPERS
// ============================

function requireUser() {
  if (!window.currentUserId) {
    throw new Error("Utente non autenticato");
  }
}

function withUserId(payload) {
  requireUser();

  if (Array.isArray(payload)) {
    return payload.map(item => ({
      ...item,
      user_id: window.currentUserId
    }));
  }

  return {
    ...payload,
    user_id: window.currentUserId
  };
}

async function safeInsert(table, payload) {
  try {
    requireUser();

    const { data, error } = await supabaseClient
      .from(table)
      .insert(withUserId(payload))
      .select();

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Errore INSERT su ${table}:`, error);
    setStatus("Errore salvataggio dati", "err");
    throw error;
  }
}

async function safeUpdate(table, payload, match) {
  try {
    requireUser();

    const { data, error } = await supabaseClient
      .from(table)
      .update(payload)
      .match(match)
      .select();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Errore UPDATE su ${table}:`, error);
    setStatus("Errore aggiornamento dati", "err");
    throw error;
  }
}

async function safeDelete(table, match) {
  try {
    requireUser();

    const { error } = await supabaseClient
      .from(table)
      .delete()
      .match(match);

    if (error) throw error;
  } catch (error) {
    console.error(`Errore DELETE su ${table}:`, error);
    setStatus("Errore eliminazione", "err");
    throw error;
  }
}
