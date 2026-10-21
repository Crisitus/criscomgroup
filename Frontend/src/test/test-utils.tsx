import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import type { ReactElement } from 'react';

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

/**
 * Renderiza un componente con todos los providers de la app:
 * QueryClientProvider + MemoryRouter + AuthProvider.
 *
 * Usar en lugar de `render()` de @testing-library/react.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...renderOptions }: RenderWithProvidersOptions = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-exportar todo de @testing-library/react para comodidad
export * from '@testing-library/react';
