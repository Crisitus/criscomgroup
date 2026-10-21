# Continuidad operativa del ERP

## Objetivo

La tienda pública y el ERP no comparten el mismo destino de recuperación. Una
caída de Ecommerce no debe impedir ventas, inventario, caja o servicio técnico.

## Rutas

- Pública normal: `https://criscomgroup.com.pe/erp/`.
- Privada de emergencia: Tailscale Serve hacia `http://127.0.0.1:8181/erp/`.
- El gateway privado solo enruta ERP, API y uploads; nunca Ecommerce.

## Recuperación

`criscom-healthcheck.timer` revisa cada minuto el núcleo DB/API/ERP y el gateway
privado. Si un componente está detenido o unhealthy, ejecuta Compose sobre
`/root/criscom-current`. Ecommerce se repara por separado.

Si la reparación normal falla tres veces consecutivas, `criscom-rebuild` valida
el SHA-256 de `/root/criscom-recovery/last-known-good.tar.gz`, extrae una release
nueva y reconstruye las imágenes. El volumen MySQL no se elimina ni reemplaza.

## Alcance real

Esta arquitectura tolera la caída de Ecommerce, del gateway público y reinicios
de procesos. No puede prometer disponibilidad si fallan simultáneamente energía,
hardware, Internet/Tailscale y el propio Ryzen. Para ese nivel se necesita una
réplica en otro host y replicación de datos.

## Prueba controlada obligatoria

1. Confirmar respaldo reciente.
2. Detener solo Ecommerce y comprobar la URL privada del ERP.
3. Esperar el timer y comprobar que Ecommerce se recupere sin reiniciar DB/API.
4. Detener el gateway privado y comprobar su recreación automática.
5. Registrar tiempos RTO y verificar que no hubo pérdida de datos (RPO).
