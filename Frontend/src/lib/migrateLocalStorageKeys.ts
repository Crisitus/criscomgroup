/**
 * Migra las claves antiguas de localStorage a las nuevas para preservar
 * las preferencias y datos locales del usuario tras el rebranding.
 * Es idempotente y debe ejecutarse una sola vez en el arranque de la app.
 */
export function migrateLocalStorageKeys(): void {
  try {
    const migrations = [
      { from: "tiktendry-theme", to: "erp-computacion-theme" },
      { from: "tikTrendySavedCarts", to: "erpComputacionSavedCarts" },
    ];

    migrations.forEach(({ from, to }) => {
      const oldData = localStorage.getItem(from);
      const newData = localStorage.getItem(to);

      if (oldData !== null && newData === null) {
        localStorage.setItem(to, oldData);
        localStorage.removeItem(from);

      } else if (oldData !== null && newData !== null) {
        // Si por alguna razón ambas existen, limpiamos la vieja para evitar conflictos
        localStorage.removeItem(from);
      }
    });
  } catch (error) {
    console.error("Error al migrar localStorage keys:", error);
  }
}
