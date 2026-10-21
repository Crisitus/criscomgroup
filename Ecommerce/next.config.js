/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite validar builds en una carpeta aislada mientras `next dev` usa .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Build standalone para empaquetado en Docker mínimo (ecommerce-integration hot-patch)
  output: 'standalone',
  reactStrictMode: true,
  images: {
    // El Ecommerce consume imágenes del Backend ERP (localhost:3100 desde el browser,
    // backend:3000 desde server-side dentro de docker). Ambos patrones deben estar permitidos.
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3100',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3100',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'backend',
        port: '3000',
        pathname: '/uploads/**',
      },
    ],
  },
  // Compatibilidad con styled-components heredados del proyecto original
  compiler: {
    styledComponents: true,
  },
  // TypeScript ya forma parte obligatoria del build. No se silencian errores:
  // una release con tipos rotos no debe llegar al dominio canónico.
  // En la prueba local, mantener tienda y ERP bajo el mismo origen para que
  // puedan compartir de forma segura la sesión guardada en localStorage.
  async rewrites() {
    const erpUrl = (process.env.ERP_INTERNAL_URL || 'http://127.0.0.1:5173').replace(/\/$/, '')
    const backendUrl = (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:3100').replace(/\/$/, '')
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
      { source: '/erp', destination: `${erpUrl}/erp/` },
      { source: '/erp/:path*', destination: `${erpUrl}/erp/:path*` },
    ]
  },
}

module.exports = nextConfig
