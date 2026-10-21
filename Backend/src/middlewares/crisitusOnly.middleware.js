// Solo la cuenta maestra real (rol 1 + MASTER_ADMIN_EMAIL). Misma regla que master.exactMaster;
// ya no hay correo por defecto en el codigo: sin variable, se deniega todo de forma uniforme.
const { exactMaster } = require('./master.middleware');

module.exports = exactMaster;
