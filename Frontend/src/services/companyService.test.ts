import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw-handlers';
import { fetchCompanyForSales } from './companyService';

// BASE URL usada por el servidor MSW (alineada con VITE_API_URL en docker-compose)
const BASE = 'http://localhost:3100/api';

// ============================================================
// B6 — V2: fetchCompanyForSales — empty state (D5 Opción C)
// DA12: test directo sobre función de servicio, sin montar
//       NewSalePage (evita refactor out-of-scope).
// ============================================================

describe('fetchCompanyForSales — empty state (V2)', () => {
  it('retorna null en lugar de lanzar error cuando no hay empresa configurada', async () => {
    server.use(
      http.get(`${BASE}/companies`, () => HttpResponse.json([])),
      http.get(`${BASE}/companies/for-sales`, () =>
        HttpResponse.json({ status: true, data: null })
      ),
    );

    const result = await fetchCompanyForSales();
    expect(result).toBeNull();
  });

  it('retorna los datos de empresa cuando existe una configurada', async () => {
    const mockCompany = {
      id_company: 1,
      razon_social: 'Empresa Test S.A.C.',
      ruc: '20000000001',
      direccion: 'Av. Test 123',
      logo_url: null,
      production: false,
    };

    server.use(
      http.get(`${BASE}/companies`, () => HttpResponse.json([])),
      http.get(`${BASE}/companies/for-sales`, () =>
        HttpResponse.json({ status: true, data: mockCompany })
      ),
    );

    const result = await fetchCompanyForSales();
    expect(result).not.toBeNull();
    expect(result?.ruc).toBe('20000000001');
    expect(result?.razon_social).toBe('Empresa Test S.A.C.');
  });
});

// ============================================================
// B8 — V3: fetchCompanyForSales — log estructurado (no AxiosError crudo)
// ============================================================

describe('fetchCompanyForSales — log estructurado en error (V3)', () => {
  it('loguea un objeto estructurado en lugar del AxiosError crudo al fallar la API', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get(`${BASE}/companies`, () => HttpResponse.error()),
    );

    await expect(fetchCompanyForSales()).rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledOnce();
    const secondArg = consoleSpy.mock.calls[0][1];
    // El segundo argumento NO debe ser una instancia de Error (AxiosError crudo)
    expect(secondArg).not.toBeInstanceOf(Error);
    // Debe ser un objeto plano con la forma { status, url, message }
    expect(secondArg).toMatchObject({ message: expect.any(String) });

    consoleSpy.mockRestore();
  });
});
