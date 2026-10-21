# Matriz profunda de menús, flujos y brechas del taller

Fecha de corte: 2026-08-24. Sistemas comparados: `Sistema Taller Demo`, `Repair Pro 0.9.6` y CRISCOM (`work/roadmap-fase1`). Este documento es el relevo operativo para otra IA: separa lo accionado en interfaz, lo encontrado en datos/binarios y lo que todavía depende de licencia, hardware o una operación que cambiaría datos.

## 1. Regla de evidencia

| Código | Significado |
|---|---|
| `UI-CLICK` | El botón, pestaña o filtro fue invocado en segundo plano y el resultado fue capturado. |
| `UI-OPEN` | Se abrió el formulario/asistente, pero no se guardó ni envió. |
| `UI-TEXT` | Texto visible/capturado; no necesariamente invocable mediante accesibilidad. |
| `DB` | Existe tabla, vista, trigger o catálogo persistente. No prueba que la función esté habilitada. |
| `BIN` | Módulo empacado en el ejecutable. Puede estar oculto, incompleto o condicionado. |
| `CFG` | Configuración o feature flag presente localmente. |
| `SRC` | Capacidad confirmada en el código actual de CRISCOM. |
| `COND` | Requiere licencia, datos, red, cámara, proveedor o una acción con efectos; no fue ejecutada. |

No se pulsaron acciones de guardar, eliminar, cobrar, facturar, exportar, sincronizar, restaurar, enviar WhatsApp ni contactar soporte. Las ventanas no se llevaron al primer plano. En `Sistema Taller`, Qt no expone controles hijos a UI Automation; por eso sus pantallas y acciones se documentan como `UI-TEXT/CFG/BIN`, no como clic independiente cuando no puede demostrarse sin tomar el escritorio.

## 2. Sistema Taller: orden, textos de acceso y uso

| Orden | Acceso visible | Submenús/acciones | Uso | Evidencia |
|---:|---|---|---|---|
| 1 | `⊕ Nueva orden` | `Guardar`, `Imprimir PDF`, `Ticket 80mm`, `Etiqueta 40x30`, `WhatsApp PDF`, `Nueva` | Recepción y documento de servicio | `UI-TEXT`, previews reales |
| 1.1 | `TIPO DE EQUIPO` | `Celular`, `Tablet`, `PC`, `Otros` | Clasificación inicial | `UI-TEXT` |
| 1.2 | `MARCA`, `MODELO`, `IMEI / SERIE`, `ACCESORIOS` | Campos libres | Identificación del equipo | `UI-TEXT` |
| 1.3 | `ESTADO FÍSICO AL RECIBIR` | foto `📷`, audio `🎤`, `OBSERVACIONES / NOTAS` | Cadena de custodia básica | `UI-TEXT` |
| 1.4 | `FALLA REPORTADA`, `REPARACIÓN / TRABAJO` | texto libre | Diagnóstico/ejecución | `UI-TEXT` |
| 1.5 | `COBROS Y RESUMEN FINANCIERO` | `COTIZACIÓN`, `ABONADO / ADELANTO`, `RECARGO %`, `TOTAL DEL SERVICIO`, `SALDO PENDIENTE` | Presupuesto y cobro | `UI-TEXT` |
| 1.6 | `⚡ SERVICIO RÁPIDO` | `+`, `Editar`, `Borrar`, `Aplicar` | Plantillas de trabajos frecuentes | `UI-TEXT` |
| 1.7 | `⚡ ESTADO DE LA ORDEN` | `Recibido`, `En reparación`, `Entregado` | Flujo simple | `UI-TEXT` |
| 1.8 | `🔐 PATRÓN / PIN` | `Patrón`, `PIN`, teclado, `Limpiar`, `CLAVE / PIN` | Acceso temporal al dispositivo | `UI-TEXT`; riesgo de privacidad |
| 2 | `▣ Órdenes guardadas` | `Buscar`, `Cargar orden`, `Anular orden` | Consulta/recuperación | `UI-TEXT` |
| 3 | `▰ Contabilidad` | `Resumen`, `Pagos de órdenes`, `Cobros pendientes`, `Costos por reparación`, `Gastos del taller`, `Cierre diario`, `Facturas emitidas` | Caja y reportes | `UI-TEXT` |
| 3.1 | Contabilidad | `Resumen PDF`, `Exportar CSV` | Salida de reportes | `UI-TEXT`, no exportado |
| 4 | `Punto de venta` | `Venta`, `Historial de ventas`, `Clientes`, `Caja`, `Productos`, `Stock`, `Facturación`, `Configuracion` | POS integrado | `UI-TEXT` |
| 4.1 | `Venta` | `Agregar · F5`, `COBRAR`, `Ticket`, `Factura`, `En espera`, `+ Producto rápido (sin código)`, `Cancelar venta` | Venta rápida | `UI-TEXT`, no cobrado |
| 5 | `⚙ Configuración` | identidad, país/moneda, impresora, textos legales, garantía, tickets, PDF, fiscalidad, visualización y seguridad de datos | Personalización/operación | `CFG` |

Hallazgos internos adicionales:

- Previews reales de orden A4, ticket 80 mm y etiqueta 40×30; carpetas separadas para comprobantes, exportaciones, facturas POS y respaldos.
- Respaldo `.stbackup`, retención configurada en 30 y estado local `nunca respaldado`; existe una posible ruta duplicada en `backup_dir` que debe probarse antes de confiar en la copia.
- `multi_red_enabled: true`; módulos nativos de descubrimiento LAN, puesto primario/secundario, base remota, snapshots, UUID de dispositivo, sincronización y conflictos (`BIN/CFG`). No se afirma que estén habilitados en la demo.
- Módulos móviles empacados para autenticación, catálogo, permisos, TLS, firewall, gateway, órdenes, migraciones, Qt bridge y administración (`BIN`). Están ofuscados y no fueron ejecutados.
- Arquitectura fiscal multinacional empacada para Argentina, Colombia, México, Honduras y otros países. Para CRISCOM esto no reemplaza SUNAT Perú.
- Protección de secretos mediante DPAPI, saneamiento contra fórmulas CSV y guardas de manipulación de tiempo en demo (`BIN`).
- La función llamada “IA” en la configuración se dedica a i18n/layout/PDF; no es diagnóstico técnico.
- La garantía legal predeterminada observada es de solo dos días. No debe copiarse como política CRISCOM.

## 3. Repair Pro: mapa completo accionado

### 3.1 Menú lateral y controles globales

| Orden | Texto exacto | Uso | Evidencia |
|---:|---|---|---|
| 1 | `Panel de Control` | KPIs y reparaciones recientes | `UI-CLICK` |
| 2 | `Reparaciones` | Ciclo de órdenes | `UI-CLICK` |
| 3 | `Stock` | Existencias y artículos | `UI-CLICK` |
| 4 | `Clientes` | CRM/cuentas | `UI-CLICK` |
| 5 | `Historial` | Registro de operaciones | `UI-CLICK` |
| 6 | `Modelos de dispositivos` | Catálogo técnico | `UI-CLICK` |
| 7 | `Desguace` | Equipos y piezas recuperadas | `UI-CLICK` |
| 8 | `Pérdidas y Gastos` | Mermas/egresos | `UI-CLICK` |
| 9 | `Diagnóstico IA` | Asistencia e historial IA | `UI-CLICK` |
| 10 | `Analítica` | Indicadores, gráficos e inventario | `UI-CLICK` |
| 11 | `Móvil` | Acceso local o nube | `UI-CLICK` |
| 12 | `Multipuesto` | Puesto único, primario o cliente | `UI-CLICK` |
| 13 | `Contabilidad` | Pérdidas/ganancias, gastos y valoración | `UI-CLICK` |
| 14 | `Presupuestos y Facturas` | Documentos comerciales | `UI-CLICK` |

Controles globales encontrados: búsqueda `Buscar clientes, reparaciones, stock, chatarra…`, modo `Local`, aviso `Copia de seguridad nunca verificada`, `Mostrar atajos de teclado`, `Notificaciones`, nota flotante `Reparaciones en curso`, `Herramientas`, `Mis módulos` y `Nova Store`. El menú de usuario contiene `Configuración`, `Centro de Ayuda`, `Idioma`, tema y cierre de sesión. Idiomas: `Español`, `Français`, `English`, `Deutsch`, `العربية`, `中文`.

### 3.2 Botones, filtros y pestañas invocados

| Pantalla | Textos accionados en segundo plano |
|---|---|
| Panel | `Vista de cuadrícula`, `Vista de lista` |
| Reparaciones | `Semana`, `Mes`, `Trimestre`, `Año`, `Personalizado`, `Estado (Todos)`, `Pago (Todos)`, `Categoría`, `Vue grille`, `Vue liste` |
| Estado de reparación | `Recibido`, `Diagnosticado`, `Piezas ordenadas`, `En curso`, `Finalizado`, `Entregado`, `Cancelado` |
| Pago de reparación | `Pagadas`, `No Pagadas`, `Todos` |
| Categoría de reparación | `Portátiles`, `Teléfonos inteligentes` |
| Stock | `Estadísticas`, `Reabastecimiento`, `Escáner`, fuente `Stock`, fuente `Desguace`, `Todos`, `In Stock`, `Stock bajo`, `Agotado`, `Venta`, `Reparación`, `Venta y Reparación (ambos)`, `Portátiles`, `Teléfonos inteligentes`, `Vue grille`, `Vue liste`, `Vue tableur` |
| Clientes | `Con deuda`, `Vue grille`, `Vue liste`; `Cuenta` requiere seleccionar cliente |
| Historial | `Semana`, `Mes`, `Trimestre`, `Año`, `Todos los estados`, `Pago (Todos)`, `Categoría`, `Vue grille`, `Vue liste` |
| Modelos | `Mostrar todos los estados`, `Todas las categorías`, `Todas las marcas`, `Portátiles`, `Teléfonos inteligentes` |
| Desguace | `Todos`, `Pendiente`, `En curso`, `Finalizado`, `Cancelado` |
| Pérdidas y Gastos | `Panel`, `Pérdidas`, `Gastos`, `Historial` |
| Diagnóstico IA | `Historial` |
| Analítica | `Visión general`, `Gráficos`, `Inventario`, `Los últimos 7 días`, `Los últimos 30 días`, `Los últimos 90 días`, `El año pasado` |
| Móvil | `Wi‑Fi local · Misma red, sin Internet · INCLUIDO`, `Remoto · Nube · Desde cualquier lugar · PRO` |
| Multipuesto | `Red local`, `A distancia · Nube`, `Puesto único`, `Puesto principal`, `Unirse a un puesto principal`, `Guía de configuración`, `Opciones avanzadas` |
| Contabilidad | `Resumen`, `Ganancias y Pérdidas`, `Gastos`, `Valoración de Inventario`, `Semana`, `Mes`, `Trimestre`, `Año` |
| Documentos | `Tous les statuts`, `Sector`; los selectores `Presupuestos 0` y `Facturas 0` no exponen patrón invocable |

Resultado: 86 capturas de submenús seguros más 10 capturas corregidas y específicas de filtros de reparación. Que un botón cambie de vista queda probado; acciones comerciales sin registros siguen condicionadas.

### 3.3 Formularios “Agregar/Nuevo” abiertos, no enviados

| Acceso exacto | Estructura/campos comprobados |
|---|---|
| `Nueva Reparación` | Asistente de 5 pasos: `Identificación del cliente` → diagnóstico/estado/daño → piezas → precio/pago → confirmación. Busca/crea cliente y modelo; categoría, marca/modelo, IMEI/serie, accesorios y desbloqueo `Ninguno/Patrón/Código/Contraseña`. |
| `Añadir un Artículo` | Nombre, SKU, código de barras, ubicación, modelos compatibles, cantidad inicial, `Guardar` y `Guardar y nuevo`. |
| `Nuevo Cliente` | Nombre, prefijo/país, teléfono y correo; el esquema soporta además empresa, crédito, descuento y fidelidad. |
| `Nuevo modelo de dispositivo` | Marca, `Añadir marca`, modelo, variantes, notas y estado inactivo. |
| `Nuevo desguace` | Modelo, IMEI, serie y asistente adelante/atrás. |
| `Nuevo Gasto` | Fecha, categoría, método de pago y detalle. |
| `Reportar una Pérdida` | Modo simple/detallado, motivo, detalle y declaración. |
| `Nuevo presupuesto` | Cliente/contacto/fiscal/dirección, sector, líneas, cantidad, unidad, precio, descuento, impuesto y notas. La pantalla mezcla textos franceses. |

### 3.4 Configuración, ayuda y módulos

Pestañas de `Configuración` accionadas: `Perfil`, `Equipo`, `Apariencia`, `Personalización`, `Facturación`, `Impresión`, `Copia de seguridad`, `Seguimiento WhatsApp`, `Atajos`, `Licencia y Actualizaciones`.

- `Perfil`: taller, teléfono, correo, dirección, código postal, ciudad y país.
- `Equipo`: miembros, actividad, agregar perfil, usuario y permisos.
- `Apariencia`: temas/paletas, modo táctil, sidebar compacto y teclado flotante.
- `Personalización`: moneda/región, etiquetas, modo equipo, descuento global y sincronización POS.
- `Facturación`: en esta instalación trata suscripción/licencia, no emisión fiscal.
- `Impresión`: recibo, factura, orden de compra, código de barras, etiqueta; impresora, papel 80×200, orientación, campos de etiqueta e impresión silenciosa.
- `Copia de seguridad`: local/nube, manual, restauración, al iniciar/cada 24 h/semanal y estadísticas. Estado real: nunca respaldado/verificado; último intento falló con HTTP 401 por credenciales inválidas.
- `Seguimiento WhatsApp`: habilitar canal, aprobación automática o cola, idioma de mensajes y página de seguimiento.
- `Atajos`: navegación `Ctrl+1…6`, `N`, `C`, `R`, `P`, `F`, `Esc` y otros.
- `Licencia y Actualizaciones`: versión 0.9.6, buscar actualización y cambio de licencia.

`Centro de Ayuda` expone FAQ, reportar problema, configurar taller, contacto directo, soporte WhatsApp, videos/tutoriales, chat en vivo y solicitud de función. Solo se abrió el panel: no se envió ningún contacto.

`Nova Store` expone módulos para copia cloud, multipuesto remoto, WhatsApp, móvil cloud, móvil local, diagnóstico IA, jerarquía de equipo, puestos adicionales, sincronización POS, Excel avanzado, desguace, reparación de PC, acceso remoto, OCR de recepción (próximamente) y videovigilancia/evidencia de recepción/entrega.

Dependencias locales instaladas fuera del menú:

- `resources/ffmpeg/ffmpeg.exe` (~102 MB): el README lo identifica como grabador de flujos RTSP para videovigilancia.
- `resources/ghostscript/gswin64c.exe` + `gsdll64.dll` (~27 MB): impresión directa con medidas exactas, incluida etiqueta 3.8×2 cm.
- `resources/sumatra/SumatraPDF.exe` (~16 MB): visor/impresor PDF empacado.
- `wa-sidecar` solo contiene el marcador de carpeta requerido por el build; no hay binario lateral de WhatsApp en esta instalación. Por tanto, el canal puede depender del ejecutable principal o de un servicio remoto y sigue condicionado.

### 3.5 Profundidad de datos y defectos encontrados

- SQLite 3.52, versión de esquema 61, WAL, `quick_check=ok`: 69 tablas, 32 vistas, 53 triggers, 126 índices, 58 claves foráneas y 18 cascadas.
- 1100 modelos activos: 689 smartphone, 410 laptop, 1 feature phone; 63 marcas. Calidad incompleta: 0 tienen variantes, año o notas rellenados aunque las columnas existen.
- Vistas para stock unificado, rotación/dormancia, valoración, alertas, IA, desguace, scoring/cuenta de cliente, KPIs, finanzas, pagos, POS y repuestos por reparación.
- Triggers para numeración `REP-YYYYMM-####`, soft-delete, auditoría, crédito/fidelidad, bloqueo de stock negativo/sobrerreserva, movimientos, piezas extraídas, pagos, subtotales, visitas y POS.
- Tipos de producto: componente, accesorio, equipo serializado, servicio y consumible de taller. Ubicaciones: proveedores, clientes, pérdida virtual, almacén, tienda, taller y zona de desguace.
- Defecto crítico para no copiar: `stock_quants` hace único `(producto, ubicación, condición)` aunque contiene lote y serie. Impide representar correctamente varios lotes o varias unidades serializadas en el mismo lugar/condición.
- Riesgo a validar: el trigger del POS inserta un movimiento ya `done`, mientras el descuento automático escucha una transición hacia `done`. La capa de aplicación podría compensarlo, pero el esquema solo no demuestra descuento.
- Localización inconsistente: francés/inglés dentro del español y valores argelinos (DZD, BaridiMob, CIB/Edahabia). No usar sus defaults en Perú.
- Módulos con flag o recursos empacados no equivalen a una función ejecutada ni licenciada.

## 4. CRISCOM actual: textos de acceso y cobertura real

Ruta principal `Servicio técnico`:

1. `Resumen del taller`.
2. `Nuevo ingreso` → `Ingreso rápido` → `Datos de recepción` → `Registrar ingreso`.
3. `Solicitudes web` → `Contactar` / `Convertir a orden`.
4. `Expedientes técnicos` → `Ingreso rápido`, `Diagnóstico asistido`, `Caja y ventas`, `Comunicación`.
5. `Diagnóstico asistido` → `Generar hipótesis verificables`, `Aprobar diagnóstico humano`, `Rechazar sugerencia`.
6. `Comunicación al cliente` → autorización/revocación, `Preparar vista previa`, `Abrir en WhatsApp`, publicar/ocultar evidencia.
7. `Armado de PCs`.
8. `Caja y ventas de servicio`.
9. `Gastos del taller` → `Registrar gasto`, editar/eliminar y vincular a orden.

El ingreso actual pide `Tipo de trabajo *`, `Cliente *`, `WhatsApp`, `DNI / RUC`, `Equipo, marca y modelo *`, `Número de serie`, `Falla indicada por el cliente *`, `Estado físico y accesorios recibidos`, consentimiento WhatsApp y `Registrar ingreso`. Es rápido, pero cliente/equipo/modelo siguen desnormalizados y estado/accesorios comparten texto libre.

Capacidades que ya existen y no deben duplicarse: solicitudes web convertibles; orden con estados amplios; cotizaciones versionadas y autorización; pagos parciales/anulación; reservas/liberaciones de repuestos con Kardex; evidencia por etapa y visibilidad; garantía/reingreso; caja/gastos; SUNAT; roles/permisos/auditoría; escaneo HID y códigos de barras con cantidad; adquisición legal de usados con SMART/TBW/horas/ciclos; diagnóstico basado en reglas con revisión humana; consentimiento y timeline OpenClaw.

Limitaciones comprobadas: el producto conserva un saldo global, una ubicación libre y condición `nuevo/segunda mano`; no tiene quants por ubicación/lote/serie. Compra detalle no conserva lote/serie/ubicación. El mensaje WhatsApp manual reconoce correctamente que “Abierto” no equivale a enviado, entregado o leído; faltan cola, idempotencia y ACK del canal de taller. El diagnóstico actual es motor de reglas PC, no RAG/LLM remoto.

## 5. Matriz de brechas y decisión

| Capacidad | Sistema Taller | Repair Pro | CRISCOM | Decisión |
|---|---|---|---|---|
| Ingreso rápido | Fuerte | Asistente fuerte | Existe | Mantener velocidad; enriquecer por pasos opcionales |
| Cliente normalizado | Básico | Completo | Parcial/desnormalizado en orden | `P0` reutilizar/crear cliente |
| Activo técnico por cliente | No probado | Modelo/reparación, no tan limpio | Falta | `P0` entidad por serie/IMEI |
| Marca/modelo/variante | Texto | Catálogo, dataset incompleto | Texto | `P0` catálogo gobernado |
| Checklist recepción | Texto + foto/audio | Estado/daño/evidencia | Texto + evidencia | `P0` checklist por tipo y riesgo |
| Accesorios separados | Texto | Estructurado parcialmente | Mezclado con estado | `P0` inventario de custodia |
| PIN/patrón | Visible | Cuatro métodos | Falta por diseño | `P0` bóveda efímera cifrada, acceso auditado |
| Evidencia foto/audio/video | Foto/audio | Cámara/video | Imagen/audio/documento | `P1` fotos guiadas y video opcional |
| Diagnóstico estructurado | Texto | IA y registros | Reglas + mediciones | Mantener revisión humana; ampliar fuentes/métricas |
| Compatibilidad | No formal | Producto/modelo | Parcial en armado | `P0` motor explicable compartido |
| Stock por ubicación | Básico | Sí | Ubicación libre | `P0` ubicaciones normalizadas |
| Lote/serie individual | No probado | Diseñado con defecto | Falta | `P0` identidad correcta por unidad/lote |
| Reservado/disponible | No probado | Sí | Reserva por orden, saldo global | `P0` quant disponible/reservado |
| Códigos/escáner | POS | Sí | Ya robusto | Reutilizar; no reescribir |
| Despiece/pieza recuperada | No | Completo | Adquisición usada fuerte, falta despiece | `P1` extender usados |
| Pérdida/merma | Gasto | Flujo propio | Ajuste/gasto, no workflow | `P1` razón, evidencia y aprobación |
| Cotización/autorización | Simple | Documentos | Versionada | CRISCOM gana; conservar |
| Pagos/auditoría | Básico | Completo | Parcial/anulación | CRISCOM gana; conservar |
| Garantía/reingreso | Días/texto | Días/fin | Inicio al entregar + reingreso | CRISCOM gana; conservar |
| WhatsApp | PDF directo | Cola/ACK/plantillas | Consentimiento/timeline/manual | `P1` outbox e idempotencia |
| Etiquetas/impresión | Muy accesible | Configurable | Documentos/códigos | `P1` etiqueta QR y perfiles de impresora |
| Valoración/rotación | Reportes simples | Vistas profundas | Costos/stock actuales | `P1` valoración, dormancia, alertas |
| Importación Excel | CSV/export | Mapeo/migración | Importaciones específicas | `P1/P2` simulación y rollback por sesión |
| Equipo/actividad | No relevante | Completo | Roles y logs | `P1` actividad y productividad responsable |
| Copia/restore verificado | `.stbackup`, nunca ejecutado | Nunca verificado, error 401 | Revisar infraestructura propia | `P1` health, restauración ensayada y alertas |
| Móvil/LAN/offline | Binario/flag | Local/cloud/multipuesto | Web central | `P2`, solo si la operación lo exige |
| Fiscal Perú | No equivalente | Argelia/defaults | SUNAT existe | No copiar fiscalidad ajena |

## 6. Flujo objetivo

```mermaid
flowchart LR
    A[Solicitud web o mostrador] --> B[Buscar/crear cliente]
    B --> C[Buscar/crear activo técnico]
    C --> D[Recepción guiada<br/>estado, accesorios, evidencia, consentimiento]
    D --> E[Triage y asignación]
    E --> F[Diagnóstico<br/>mediciones + IA + revisión humana]
    F --> G[Cotización versionada]
    G --> H{Autorizada}
    H -- No --> I[Devolución/cancelación controlada]
    H -- Sí --> J[Reservar repuestos compatibles]
    J --> K[Trabajo + series/lotes + evidencias]
    K --> L[Pruebas y control de calidad]
    L --> M[Cobro + comprobante]
    M --> N[Entrega<br/>accesorios, firma, borrar credencial]
    N --> O[Garantía y seguimiento]
    O --> P[Analítica y aprendizaje]
```

## 7. Diseño recomendado y textos de acceso

No agregar diez ítems al sidebar. Mantener puertas actuales:

- `Nuevo ingreso`: `Cliente` → `Identificar equipo` → `Estado y accesorios` → `Evidencias` → `Consentimientos` → `Comprobante de recepción`.
- `Expedientes técnicos`: `Recepción`, `Diagnóstico`, `Cotización`, `Trabajo y repuestos`, `Pruebas`, `Pagos`, `Entrega y garantía`, `Historial`.
- `Productos e inventario`: `Existencias`, `Ubicaciones`, `Movimientos`, `Compatibilidad`, `Series y lotes`, `Equipos usados y despiece`.
- `Diagnóstico asistido`: `Datos`, `Mediciones`, `Manuales y casos`, `Hipótesis IA`, `Validación técnica`, `Aprendizaje`.
- `Administración`: `Catálogos técnicos` para tipos, marcas, modelos, variantes, fallas, pruebas, piezas y reglas.

Botones recomendados: `Buscar activo por serie`, `No encuentro el modelo`, `Agregar accesorio recibido`, `Capturar evidencia`, `Guardar credencial temporal`, `Agregar repuesto compatible`, `Reservar existencia`, `Registrar pieza externa`, `Liberar reserva`, `Registrar componente retirado`, `Enviar a despiece`, `Registrar prueba`, `Validar diagnóstico`, `Marcar listo para entrega`, `Entregar y activar garantía`.

## 8. Backlog vertical para implementación

1. `P0-A`: `Cliente → Activo técnico → Orden`, con migración compatible con órdenes actuales, búsqueda por serie/IMEI y pruebas de aislamiento por negocio.
2. `P0-B`: recepción estructurada, accesorios, checklist, evidencia guiada y bóveda efímera; nunca guardar credenciales en texto plano ni imprimirlas.
3. `P0-C`: WMS mínimo sobre `Producto`: ubicación, quant, lote, unidad serial, reservado/disponible y movimientos transaccionales. Diseñar la unicidad por identidad real, no copiar la de Repair Pro.
4. `P0-D`: compatibilidad explicable compartida por taller, armado, ventas y compras; permitir excepción solo con razón y auditoría.
5. `P1-A`: despiece sobre `adquisiciones_usados`, piezas extraídas, pruebas, grado, QR, costo asignado y margen.
6. `P1-B`: IA gobernada: proveedor/modelo, versión, prompt, fuentes, confianza, tokens, costo, latencia y feedback; humano conserva autoridad.
7. `P1-C`: outbox WhatsApp con clave idempotente, reintentos, estados del proveedor y privacidad.
8. `P1-D`: valoración, rotación, dormancia, alertas, pérdida/merma, importador con simulación y salud de backup/restauración.
9. `P2`: móvil/LAN/offline solo después de demostrar la necesidad; exige cifrado local, cola idempotente y resolución explícita de conflictos.

## 9. No copiar

- El valor único defectuoso de Repair Pro para quants con lote/serie.
- El posible encadenamiento incompleto de triggers POS sin prueba en la capa de aplicación.
- La mezcla de idiomas, DZD y métodos de pago argelinos.
- La garantía predeterminada de dos días de Sistema Taller.
- Llamar “IA diagnóstica” a automatizaciones de PDF/layout/i18n.
- Activar credenciales de desbloqueo sin cifrado, acceso granular, auditoría y destrucción.
- Añadir módulos cloud/móvil/multipuesto solo porque aparecen en un referente.
- Duplicar inventario, clientes, caja, cotizaciones, evidencias o roles que CRISCOM ya posee.

## 10. Artefactos de relevo

Los archivos detallados están bajo `C:\Users\User\CRISCOM\cristem\generated`:

- `auditoria-sistemas-taller-criscom.md`: informe acumulativo.
- `mapa-menus-tres-sistemas.html`: cuadro/mapa visual.
- `flujo-taller-criscom.html`: diagrama de flujo.
- `repair-pro-uia-pages.json`: 14 páginas y árboles de controles.
- `repair-pro-uia-forms-and-support.json`: 8 formularios, ayuda y soporte.
- `repair-pro-uia-submenus.json`: 86 capturas de submenús, configuración y controles globales.
- `repair-pro-uia-repair-submenus.json`: filtros de reparación corregidos.
- `repair-pro-database-deep-audit.json`: 69 tablas, vistas, triggers, índices, catálogos y agregados.
- `repair-pro-database-audit.json`: auditoría anterior y esquema detallado.
- `repair-pro-audit-seed.json`: registro de la prueba controlada/limpieza `AUDIT-*`.
- `sistema-taller-pyinstaller-inventory.json`: 1552 entradas del ejecutable.
- `sistema-taller-pyz-modules.json`: 1460 módulos del PYZ.
- `sistema-taller-pyz-extracted/`: módulos seleccionados extraídos para análisis.
- `audit-backups/20260824-043112/`: respaldo previo a la prueba controlada.

Estado de producto al cerrar esta auditoría: no se modificó código funcional, base ni configuración de CRISCOM. Este documento propone arquitectura y prioridades; no autoriza despliegue.
