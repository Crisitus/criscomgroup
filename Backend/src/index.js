require('dotenv').config(); // Cargar .env antes de validar variables
// Secretos SUNAT locales, fuera del repositorio. Las variables ya definidas tienen prioridad.
require('dotenv').config({
  path: process.env.SUNAT_SECRETS_FILE || 'C:\\Users\\brigi\\.openclaw\\private\\sunat\\sunat.env',
  override: false,
});

const { validateEnv } = require('./config/validateEnv');
validateEnv(); // Abortar arranque si faltan variables críticas en producción

const {app, server} = require("./app");
const { sequelize, connectDB } = require('./config/database');
const { seedRoles } = require('./models');
const { seedMasterAdmin } = require('./scripts/seed-admin');
const { ensureCommerceSchema } = require('./scripts/ensure-commerce-schema');
const { ensureServiceSchema } = require('./scripts/ensure-service-schema');
const { ensureAcquisitionSchema } = require('./scripts/ensure-acquisition-schema');
const { ensureContentSchema } = require('./scripts/ensure-content-schema');
const { ensureAuditSchema } = require('./scripts/ensure-audit-schema');
const { ensureAdminUsersSchema } = require('./scripts/ensure-admin-users-schema');
const { ensureSeriesComprobantes } = require('./scripts/ensure-series-comprobantes');
const { ensureInventoryConstraints } = require('./scripts/ensure-inventory-constraints');
const { recoverStuckCampaigns } = require('./services/community.service');
const { startOrderExpirationJob } = require('./services/order-expiration.service');

const port = process.env.PORT || 3000;

const runStage = async (name, task) => {
  const startedAt = Date.now();
  console.log(`[startup] ${name}: iniciando`);
  const result = await task();
  console.log(`[startup] ${name}: listo en ${Date.now() - startedAt} ms`);
  return result;
};

const startServer = async () => {
  await runStage('base de datos', connectDB);
  await runStage('esquema usuarios', ensureAdminUsersSchema);
  await runStage('esquema comercial', ensureCommerceSchema);
  await runStage('esquema servicio técnico', ensureServiceSchema);
  await runStage('esquema componentes usados', ensureAcquisitionSchema);
  await runStage('esquema blog y contenidos', ensureContentSchema);
  await runStage('diagnostico empresa y SUNAT', () => require('./scripts/ensure-admin-empresa-schema').ensureAdminEmpresaSchema());
  await runStage('esquema auditoría', ensureAuditSchema);
  await runStage('series de comprobantes', ensureSeriesComprobantes);
  await runStage('constraints de inventario', ensureInventoryConstraints);
  await runStage('recuperar campañas de comunidad', recoverStuckCampaigns);
  await runStage('roles', seedRoles);
  await runStage('usuario maestro', seedMasterAdmin);
  startOrderExpirationJob();
  server.listen(port, () => console.log('Servidor escuchando en: ', port));
};

startServer().catch(async error => {
  console.error('[startup] Error fatal: el servidor no pudo iniciar.', error);
  await sequelize.close().catch(() => {});
  process.exitCode = 1;
});
