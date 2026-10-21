# Respaldo local de Criscom Group

Este directorio conserva la estructura del repositorio GitHub y todos los cambios locales realizados hasta el 3 de agosto de 2026.

## Componentes

- `Backend/`: API Express, MySQL/MariaDB, inventario, usuarios, pedidos, pagos, Culqi, SUNAT y adquisiciones usadas.
- `Frontend/`: ERP React/Vite con roles, vendedores, ventas, facturación SUNAT, adquisiciones y administración.
- `Ecommerce/`: tienda pública Next.js, catálogo, carrito, checkout Culqi y seguimiento de pedidos.
- `deploy/` y archivos Docker: configuración para despliegue bajo un mismo dominio.

## Funciones incorporadas

- Tienda moderna responsive en cyan/celeste/azul eléctrico.
- Inventario compartido entre la tienda y el ERP.
- Roles separados para cuenta maestra, administradores, vendedores y clientes.
- Pedidos web y checkout con Culqi; las claves privadas permanecen en el backend.
- Boletas y facturas UBL 2.1, firma digital, envío SUNAT y almacenamiento privado de XML/CDR.
- Notas de venta internas diferenciadas de los comprobantes fiscales.
- Productos nuevos o de segunda mano, garantía configurable y estado informado.
- Expedientes privados de adquisición usada con procedencia, costo real, serie y transferente.
- Preparación para dos emisores fiscales: RUC 10 activo/predeterminado y RUC 20 deshabilitado hasta su configuración independiente.

## Seguridad del respaldo

Este respaldo excluye archivos `.env`, certificados, claves privadas, credenciales SOL/Culqi, bases de datos, dependencias instaladas, compilaciones y registros. Los archivos `.env.example` contienen únicamente plantillas.

## Restauración

1. Copiar la carpeta a la ubicación de trabajo.
2. Crear los `.env` privados a partir de cada `.env.example`.
3. Ejecutar `npm install` dentro de `Backend`, `Frontend` y `Ecommerce`.
4. Configurar MySQL/MariaDB y arrancar el backend para aplicar el esquema.
5. Probar primero Culqi y SUNAT en modo sandbox.
6. No activar producción hasta instalar las credenciales y certificados reales fuera del repositorio.

## Estado de validación

- ERP: TypeScript y compilación de producción correctos.
- Ecommerce: TypeScript y compilación de 29 rutas correctos.
- Backend: sintaxis JavaScript correcta.
- Las pruebas integrales del backend requieren el host de base de datos de pruebas `db-test`.
- La emisión real SUNAT y los cobros reales Culqi siguen pendientes de credenciales externas y pruebas de aceptación.

