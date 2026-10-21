# Relevo para IAs — catálogo, imágenes, proveedores y precios

Actualizado: 2026-08-25 (America/Lima)

## Objetivo vigente

Continuar limpiando el catálogo de Criscomgroup producto por producto. Cada ficha debe tener nombre correcto, categoría correcta, una sola ficha por producto, proveedores aliados privados, stock sin duplicar y tres o más imágenes que correspondan exactamente al modelo. No usar imágenes con marcas de agua de Rematazo, CompuTactus, Createc u otros distribuidores.

## Proyecto y producción usados en este bloque

- Copia de trabajo efectiva: `C:\Users\User\Documents\Codex\2026-08-24\pu\work\criscom-current`.
- Backend desplegado: contenedor Docker `criscomgroup-backend` en el Ryzen.
- Host Ryzen: `ACM@192.168.15.56`.
- Desde esta copia se usaron `..\ryzen_key` y `..\known_hosts`. No guardar contraseñas en documentación.
- Sitio/ERP: `https://criscomgroup.com.pe/erp/`.

Antes de editar, comprobar el estado real del árbol y no asumir que la antigua ruta `C:\Users\User\CRISCOM\criscom-web` sigue siendo la copia activa de este trabajo.

## Reglas obligatorias dadas por Crisitus

1. Verificar visualmente cada imagen, idealmente una por una.
2. Usar el número de parte/modelo exacto; si el nombre admite varias variantes, dejarlo pendiente.
3. Cada producto debe tener varias vistas distintas. Meta actual: tres imágenes verificadas por producto.
4. No repetir una imagen dentro de la galería ni reutilizar una imagen genérica en productos diferentes salvo que sean realmente el mismo chasis/modelo.
5. No usar marcas de agua ni logos de distribuidores. El logo propio de la marca del producto sí es válido.
6. El distribuidor y su costo solo deben ser visibles para el usuario maestro Crisitus.
7. Stock propio tiene prioridad. Solo stock propio suma al valor de inventario. Stock de aliados no es inventario propio.
8. Stock de Lima debe indicarse como otra sede. Actualmente la operación prioriza Arequipa.
9. Productos agotados al final. Disponibles, competitivos y con mejor relación precio/calidad primero.
10. No sumar existencias de publicaciones duplicadas del mismo proveedor como si fueran stock distinto.
11. Precios de venta terminan siempre en 0 o 5. Mantener las reglas de margen ya acordadas y comparar mercado antes de subir precios.
12. No mostrar públicamente el nombre del proveedor; los datos permanecen en ERP para Crisitus.

## Implementación de imágenes

Archivos centrales:

- `Backend/src/scripts/verified-image-manifest.json`: manifiesto de productos y galerías verificadas.
- `Backend/src/scripts/import-verified-images.js`: descarga cada imagen, elimina toda la galería anterior del producto, guarda las nuevas vistas y cambia `imagen_url` a la principal.
- `Backend/src/scripts/catalog-image-queue.js`: genera la cola de productos que aún no llegan a tres imágenes.

El importador fue corregido para ejecutar `ProductoImagen.destroy({ where: { id_producto } })` antes de crear la nueva galería. No eliminar este comportamiento: evita imágenes antiguas, equivocadas y duplicadas.

## Método de trabajo recomendado

1. Ejecutar la cola y tomar referencias inequívocas, preferentemente productos de mayor precio.
2. Confirmar modelo/part number con fuente oficial o página comercial exacta.
3. Extraer tres URLs limpias y distintas.
4. Descargar copias temporales y abrirlas con inspección visual.
5. Rechazar cualquier vista que corresponda a otra variante, color, capacidad o modelo.
6. Añadir la entrada al manifiesto con `apply_patch`.
7. Validar el JSON.
8. Copiar el manifiesto al Ryzen, ejecutar el importador y después la auditoría.
9. Confirmar que pendientes e imágenes faltantes bajaron en la cantidad esperada.

Comandos usados (ejecutar desde la raíz de `criscom-current`):

```powershell
node -e "JSON.parse(require('fs').readFileSync('Backend/src/scripts/verified-image-manifest.json','utf8')); console.log('manifest OK')"
scp.exe -q -i ..\ryzen_key -o UserKnownHostsFile=..\known_hosts Backend\src\scripts\verified-image-manifest.json ACM@192.168.15.56:verified-image-manifest.json
ssh.exe -i ..\ryzen_key -o UserKnownHostsFile=..\known_hosts ACM@192.168.15.56 "wsl -u root -- bash -lc 'docker cp /mnt/c/Users/ACM/verified-image-manifest.json criscomgroup-backend:/app/src/scripts/verified-image-manifest.json && docker exec criscomgroup-backend node src/scripts/import-verified-images.js && docker exec criscomgroup-backend node src/scripts/catalog-image-queue.js'"
```

La descarga HTTPS directa desde Windows falló a veces por `SEC_E_NO_CREDENTIALS`. La alternativa usada fue descargar mediante `wget` dentro de WSL en el Ryzen, copiar el archivo a `C:\Users\ACM` y recuperarlo por SCP para inspección visual.

## Estado exacto al cerrar

- Productos totales: 2929.
- Productos pendientes de completar: 2878 (antes 2879).
- Imágenes faltantes para llegar a tres: 7186 (antes 7189).
- Última auditoría: `2026-08-25` tras el bloque CRiSTEM/Anthropic (delta 2686).

## Productos completados y desplegados (tres imágenes cada uno)

- 2824 — MSI RTX 5070 World of Warcraft Midnight Void.
- 2837 — ASUS Prime RTX 5070 12 GB.
- 2370 — Lenovo LOQ 15ARP10E.
- 2371 — Lenovo LOQ 15IAX9.
- 2361 — ASUS TUF A15 FA506NCG-HN334 / 90NR0JF7-M00SP0.
- 2331 — ASUS TUF F16 FX607V.
- 2025 — ASUS ExpertBook PM1503CDA Ryzen 7.
- 2354 — Acer Aspire Go 15 AG15-42P-R917.
- 2353 — ASUS Vivobook X1504VA táctil.
- 2362 — ASUS Vivobook X1504VA.
- 2338 — ASUS Vivobook M1502XA-BQ003W Quiet Blue.
- 2024 — ASUS ExpertBook PM1503CDA Ryzen 5.
- 2820 — ASUS Dual RX 9060 XT 16 GB.
- 2835 — ASUS Dual RTX 5060 OC 8 GB.
- 2846 — MSI RTX 5050 Ventus 2X OC.
- 2405 — ASUS ROG Strix B850-A Gaming WiFi.
- 2847 — MSI RTX 3050 Low Profile 6 GB.
- 2836 — ASUS Dual RTX 3050 OC 6 GB.
- 2402 — ASUS PRIME X870-P WiFi.
- 2851 — XFX Speedster QICK 308 RX 7600 Black Edition, `RX-76PQICKBY`.
- 2830 — Zotac RTX 3050 Twin Edge OC 6 GB, `ZT-A30510H-10L`.
- 2142 — Corsair Crystal 680X RGB White, `CC-9011169-WW`.
- 2800 — WD Green 2 TB SATA 2.5, `WDS200T2G0A`.
- 2447 — Corsair Vengeance 16 GB DDR5-5600 SODIMM CL48, `CMSX16GX5M1A5600C48`.
- 2686 — AMD Ryzen 7 7700X, `100-100000591WOF` (CRiSTEM/Anthropic 2026-08-25). Caja oficial AMD + chip en ángulo + cara inferior AM5. **Estaba en la lista de "bloqueados" por falta de vistas; no estaba realmente bloqueado, solo faltaba la fuente correcta.**

## Consolidación de duplicados realizada

Los productos 2800 y 2801 eran el mismo WD Green 2 TB: mismo proveedor, ciudad, costo, precio y stock, con códigos Rematazo 9261 y 10239. Se consolidaron en 2800:

- Stock aliado final: 10, no 20.
- Los códigos se conservaron en el registro privado como `9261 / 10239`.
- El movimiento de inventario de 2801 se reasignó a 2800.
- La oferta duplicada y el producto 2801 se eliminaron.
- Nombre público final: `SSD WD Green 2TB SATA 2.5 WDS200T2G0A`.

## Referencias pendientes o ambiguas conocidas

- 2561 — `MOUSE REGALO`: no identifica modelo; no asignar imagen.
- 2350 — Lenovo IdeaPad Slim 3 Touch i5-13420H 15.3: falta número completo de modelo.
- 2344 — HP 15-fc0354la / D6ZM9LA: modelo exacto confirmado, pero la galería oficial fue inaccesible.
- 2364 — ASUS Vivobook Go 15 E1504FA-BQ5556 / 90NB0ZR3-M07Y50: no se obtuvieron tres imágenes limpias; las disponibles de distribuidor tenían marca.
- 2826 — RTX 5050 `TWIND EGDE`: falta fabricante y el nombre contiene errores.
- 2852 — XFX `SWIFT RX 9060 8GB OEM`: posible nombre/modelo incorrecto; confirmar antes de usar fotos.
- 2686 — Ryzen 7 7700X: identificado como `100-100000591WOF`, pero faltan tres vistas útiles.
- 2702 — Intel Core i5-14400F OEM: Intel confirma dos códigos tray (`CM8071505093011` y `CM8071504821113`) según stepping; no usar foto de caja.
- 2468 — XPG Lancer Blade Black 16 GB 5600: confirmar part number exacto antes de publicar.
- 2389 — MSI MAG B860 Tomahawk WiFi: modelo exacto, pero MSI bloqueó la extracción técnica de la galería en el último intento.
- 2422 — Gigabyte B850 Aorus Elite: el nombre no confirma si es la variante WiFi 7; no asumir.

Algunas páginas de ASUS incluyen galerías de productos recomendados dentro del mismo HTML. No confiar en que todas las URLs encontradas en una página pertenecen al producto principal. Este error fue detectado y las imágenes incorrectas fueron rechazadas antes de publicarse.

## Próxima acción sugerida

1. Volver a generar `catalog-image-queue.js` y guardar los primeros 20.
2. Continuar con referencias exactas y accesibles por este orden aproximado: XPG Lancer Blade (solo tras obtener part number), MSI B860 Tomahawk, Gigabyte B850/X870 tras definir variante, luego CPU OEM con fotografía de chip correcta.
3. Auditar duplicados por nombre normalizado + capacidad + modelo + proveedor antes de añadir imágenes a dos fichas parecidas.
4. No detener el trabajo por páginas bloqueadas: dejarlas en la lista ambigua y pasar a la siguiente referencia exacta.
5. Después de cada lote, registrar nuevos IDs, conteos y cualquier consolidación en este documento.

## Trabajo mayor aún pendiente del proyecto

Además de imágenes, Crisitus solicitó mantener sincronización automática de stock/precios de aliados con alerta cuando cambien enlaces; proveedores y costos privados; prioridad del stock real; reglas de stock bajo; orden del catálogo; validaciones DNI/RUC; correcciones del carrito; numeración de pedidos `AAMMDDNNN`; WhatsApp con enlace de seguimiento; y reflejo coherente en ERP, compras y delivery. No asumir que todo esto quedó terminado solo porque las galerías funcionan. Revisar código y pruebas antes de declarar cada módulo completo.

## Método mejorado — CRiSTEM (Anthropic), 2026-08-25

Continuación con "encárgate de todo" de Crisitus. Ajustes al procedimiento que resuelven fricciones reales encontradas:

1. **Buscador:** el `web_search` de OpenClaw (Gemini) sigue con API key inválida. Usar el buscador nativo del harness o consultar APIs directas por `curl`.
2. **Fuentes limpias vía curl LOCAL (IP residencial), no datacenter.** AMD/Amazon/TechPowerUp bloquean el fetch de datacenter (403/ECONNRESET), pero `curl` desde la laptop de Crisitus (IP residencial) entra (200). La galería suele estar en JSON embebido del HTML crudo, no en `<img>`. Extracción probada:
   - AMD oficial: `dam/amd/.../<id>-<modelo>.jpg` dentro del HTML.
   - Amazon hi-res: `grep -oE 'https://m\.media-amazon\.com/images/I/[A-Za-z0-9._+-]+\._AC_SL1500_\.jpg'` sobre el HTML crudo → renders limpios 1500px, sin marca de agua, modelo exacto.
   - El contenedor `criscomgroup-backend` corre en la red residencial del Ryzen, así que su `fetch()` de estas URLs también funciona.
3. **Verificación visual real:** descargar candidatas a `.img-work/` y abrirlas (Read de imagen) antes de aceptar. Rechazar fotos caseras de build (Wikimedia Commons está contaminado con capturas de video-reviews y fotos de hobbyista: NO sirve para catálogo).
4. **Import por DELTA, no el manifiesto completo.** El importador procesa todo el manifiesto y `destroy` la galería antes de descargar; si una URL vieja muere, aborta y puede dejar sin imágenes un producto ya bueno. Solución: subir un manifiesto con SOLO los IDs nuevos, `docker cp` sobre `verified-image-manifest.json` del contenedor, correr el importador y auditar. El manifiesto canónico completo (para el registro) vive en git en la maestra `criscom-web` (`Backend/src/scripts/verified-image-manifest.json`), ahora **versionado** (antes estaba untracked).
5. **Insight clave:** la lista de "bloqueados/ambiguos" de la otra IA en gran parte NO estaba bloqueada; solo le faltaba la fuente correcta. 2686 lo demostró. Revisar esa lista con las fuentes de arriba antes de descartar.
6. **Problema de datos, no de imagen:** varios registros de la cola tienen nombre/precio corruptos de Rematazo (ej. `2561 MOUSE REGALO` a S/3815, `2826 TWIND EGDE`, `2852 SWIFT RX 9060 OEM`, kits con capacidad ambigua). Eso se corrige en el registro del producto, no asignando imágenes. Necesita criterio/product-knowledge de Crisitus o investigación por ítem.
7. **Escala:** 2878 productos × verificación visual es trabajo de muchas sesiones. Estrategia: priorizar por precio/rotación, correr en lotes por delta, registrar IDs y conteos aquí en cada lote.

