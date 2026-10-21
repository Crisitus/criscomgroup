# Administracion - arreglo de logica (reglas comunes a los 5 writers)
Repo /Users/soulkin/Downloads/criscom-web-main (sin git). Cada writer lee SU informe odd/tasks/admin-<x>-auditoria.md y arregla en backend (y en el front SOLO lo imprescindible para no romper el contrato y distinguir error de vacio; el rediseno visual viene despues desde Open Design).
## Criterio de decision
- Defectos de SEGURIDAD o integridad (secretos/contrasenas en claro, escalada de privilegios, costos expuestos a quien no debe, handlers sin try/catch, borrados sin guardas): se arreglan SIEMPRE.
- Decisiones de negocio del informe ("decisiones del usuario"): aplica el valor por defecto MAS CONSERVADOR y REVERSIBLE (no automatizar dinero, stock ni envios reales; no borrar datos; no cambiar politicas de contrasena/sesion mas alla de lo seguro) y documentalo en el informe bajo "## Decisiones aplicadas por defecto / pendientes del usuario".
- Fechas: iso() con -05:00 y reload() tras create/update (ver odd/tasks/marketing-blog-logica.md); fecha civil (DATE) como texto, sin zona.
- Errores: JSON {message, errores?:{campo:msg}}; 500 nunca sin cuerpo; handlers async con try/catch (patron safe() del blog.controller.js).
- Auditoria nueva: registrarAuditoria + capturarEstadoOriginal (patron routes/blog.routes.js). No cambies middlewares/audit.middleware.js salvo el writer de "Logs de auditoria".
## Reglas tecnicas
- Respaldo previo de cada archivo que reescribas en odd/backup/administracion/ (si no esta ya).
- Ninguna llamada de herramienta con mas de ~4 KB de contenido (upstream_timeout a 90 s): escribe por partes (cat >>) o divide en modulos. Write/Edit convierte tildes/comillas a \uXXXX/ASCII: usa python3+heredoc o constantes y verifica con grep que no queden \u en textos visibles.
- Jest SOLO en contenedor y con candado /tmp/jest.lock (mkdir; reintenta hasta liberar; rmdir al terminar; otros writers lo usan): docker compose -p criscom -f docker-compose.dev.yml -f docker-compose.local.yml exec -T -e NODE_ENV=test backend npx jest --runInBand --forceExit <suite>. Tests nuevos en Backend/__tests__/integration/admin-<x>-logica.test.js; corre tambien las suites previas del area y no-console-log.test.js (prohibido console.log en src: usa console.info/warn/error).
- Front: docker compose -p criscom -f docker-compose.dev.yml -f docker-compose.local.yml exec -T frontend sh -c 'npx tsc -p tsconfig.app.json --noEmit' -> 0 errores (si ves errores de archivos de otro writer, filtra por tus rutas y repite).
- docker compose restart NO relee env_file: usa up -d --force-recreate backend si cambias env.
- Datos de prueba con marca 'seed-adm'; limpialos al terminar salvo que se pidan para el diseno (anotalo). API real :3100, front :5173. Token: /tmp/crlogin.js (usuario id 1) o firmalo con JWT_SECRET en el contenedor backend.
- NUNCA imprimas ni guardes secretos, hashes ni contrasenas reales en informes, logs o memoria.
## Entrega
Estado (done/partial/blocked), archivos tocados, `<comando>: <resultado observado>`, "## Contrato final" (rutas, parametros, codigos, formas de respuesta) al final de TU informe, decisiones aplicadas por defecto, datos que el brief de diseno necesita, y "## Key Learnings" (1-5). Guarda con mem_save (project 'criscomgroup', topic_key 'criscomgroup/admin-<x>-logica') lo no obvio.
## INCIDENTE 10-oct (NO REPETIR)
Un writer ejecuto sequelize.sync({force:true}) en un script suelto dentro del contenedor y vacio la BD de DESARROLLO erp_computacion (NODE_ENV=test NO cambia de BD; solo __tests__/setup.env.js lo hace). Recuperada por binlog (odd/backup/administracion/db-restore/). REGLA: prohibido sync({force}), DROP, TRUNCATE o DELETE masivo contra erp_computacion; los scripts sueltos deben cargar Backend/__tests__/setup.env.js o apuntar al servicio db-test; jest siempre via la suite.
