# Arquitectura prevista en Google Cloud

## Servicios

- Cloud Run: tienda Next.js.
- Cloud Run: API Express.
- Cloud Run o contenido estático: ERP Vite.
- Cloud SQL for MySQL: base de datos privada.
- Secret Manager: credenciales y certificados.
- Cloud Storage: imágenes, XML, CDR y documentos.
- HTTPS Load Balancer: rutas `/`, `/erp` y `/api` bajo el mismo dominio.
- Cloud Build + Artifact Registry: imágenes y despliegues reproducibles.

## Controles de costo

- instancias mínimas en cero durante pruebas;
- máximo de instancias limitado;
- región cercana compatible con todos los servicios;
- alertas de presupuesto antes del despliegue;
- evitar conectores VPC cobrables cuando sea posible;
- Cloud SQL con el tamaño mínimo que soporte carga y respaldo.

## Controles de seguridad

- API y sitios públicos solo por HTTPS;
- MySQL sin IP pública, salvo una migración temporal y restringida;
- cuentas de servicio separadas y permisos mínimos;
- secretos montados desde Secret Manager;
- logs sin contraseñas, tokens, documentos, correos ni datos de tarjeta;
- archivos privados fuera del directorio público;
- backups automáticos y restauración ensayada.

La creación de recursos y la vinculación de facturación requieren aprobación manual del propietario porque generan costos externos.

