import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// VITE_API_URL está definido en docker-compose → http://localhost:3100/api
const BASE = 'http://localhost:3100/api';

export const handlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email && body.password) {
      return HttpResponse.json({
        success: true,
        // JWT válido mock: payload = {"id":1,"id_role":1} en base64url
        // AuthContext decodifica el payload para extraer id_role
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWRfcm9sZSI6MX0.mock-sig',
        user: { id_user: 1, name: 'Test User', email: body.email, id_role: 1 },
      });
    }
    return HttpResponse.json({ msg: 'Credenciales incorrectas' }, { status: 400 });
  }),

  http.get(`${BASE}/productos`, () => {
    return HttpResponse.json([]);
  }),
];

export const server = setupServer(...handlers);
