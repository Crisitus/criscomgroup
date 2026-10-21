import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import RoleProtectedRoute from './RoleProtectedRoute';

// Wrapper que permite inyectar usuario vía localStorage antes de montar
function makeWrapper(route = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function DelegatedAreaRoute() {
  const { loading } = useAuth();
  if (loading) return null;
  return (
    <RoleProtectedRoute allowedRoles={[1, 2]}>
      <span data-testid="contenido-delegado">Contenido delegado</span>
    </RoleProtectedRoute>
  );
}

describe('RoleProtectedRoute', () => {
  // TEST 7.1 — Rol permitido → renderiza children
  it('renderiza los children cuando el usuario tiene un rol permitido', async () => {
    localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiaWRfcm9sZSI6MX0.sig');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Gerente', email: 'g@test.local', id_role: 1 }));

    render(
      <RoleProtectedRoute allowedRoles={[1, 2]}>
        <span data-testid="contenido-protegido">Contenido</span>
      </RoleProtectedRoute>,
      { wrapper: makeWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('contenido-protegido')).toBeInTheDocument();
    });
  });

  // TEST 7.2 — Rol no permitido → no renderiza children (redirige a "/")
  it('no renderiza los children cuando el usuario no tiene el rol requerido', async () => {
    localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MywiaWRfcm9sZSI6M30.sig');
    localStorage.setItem('user', JSON.stringify({ id: 3, name: 'Vendedor', email: 'v@test.local', id_role: 3 }));

    render(
      <RoleProtectedRoute allowedRoles={[1, 2]}>
        <span data-testid="contenido-protegido">Contenido</span>
      </RoleProtectedRoute>,
      { wrapper: makeWrapper('/protegido') }
    );

    await waitFor(() => {
      expect(screen.queryByTestId('contenido-protegido')).not.toBeInTheDocument();
    });
  });

  // TEST 7.3 — user=null (sin sesión) → userRole=4 por defecto → redirige
  it('redirige cuando no hay usuario autenticado (user=null)', async () => {
    // localStorage vacío → user null → userRole = 4 (No Autorizado)
    render(
      <RoleProtectedRoute allowedRoles={[1, 2]}>
        <span data-testid="contenido-protegido">Contenido</span>
      </RoleProtectedRoute>,
      { wrapper: makeWrapper('/protegido') }
    );

    await waitFor(() => {
      expect(screen.queryByTestId('contenido-protegido')).not.toBeInTheDocument();
    });
  });

  it.each([
    ['/services', 'servicio_tecnico'],
    ['/categories', 'inventario'],
    ['/blog', 'marketing'],
    ['/company?tab=payments', 'pagos_pos'],
  ])('respeta el permiso de área en %s', async (route, area) => {
    localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6NSwiaWRfcm9sZSI6NX0.sig');
    localStorage.setItem('user', JSON.stringify({
      id: 5,
      name: 'Usuario delegado',
      email: 'delegado@test.local',
      id_role: 5,
      area_grants: [area],
    }));

    render(<DelegatedAreaRoute />, { wrapper: makeWrapper(route) });

    await waitFor(() => {
      expect(screen.getByTestId('contenido-delegado')).toBeInTheDocument();
    });
  });
});
