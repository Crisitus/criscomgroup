import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, waitFor, act } from '../test/test-utils';
import { useAuth } from './AuthContext';

// Componente auxiliar para exponer el contexto en tests
function AuthConsumer() {
  const { isAuthenticated, user, logout, login } = useAuth();
  return (
    <div>
      <span data-testid="is-authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user-email">{user?.email ?? 'sin-usuario'}</span>
      <button onClick={logout}>logout</button>
      <button
        onClick={() => login('test@test.local', 'Test123!')}
        data-testid="btn-login"
      >
        login
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  // TEST 8.1 — Token en localStorage antes de montar → isAuthenticated=true
  it('inicializa isAuthenticated=true cuando hay token y usuario en localStorage', async () => {
    localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.sig');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test', email: 'test@test.local', id_role: 1 }));

    renderWithProviders(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    });
    expect(screen.getByTestId('user-email').textContent).toBe('test@test.local');
  });

  // TEST 8.2 — logout() vacía localStorage y resetea estado
  it('logout() limpia localStorage y establece isAuthenticated=false', async () => {
    localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.sig');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test', email: 'test@test.local', id_role: 1 }));

    renderWithProviders(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
    });

    act(() => {
      screen.getByRole('button', { name: 'logout' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated').textContent).toBe('false');
    });
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  // TEST 8.3 — login() llama la API (MSW) y guarda token en localStorage
  it('login() llama la API y guarda token en localStorage al éxito', async () => {
    renderWithProviders(<AuthConsumer />);

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    await waitFor(() => {
      expect(localStorage.getItem('token')).not.toBeNull();
    });
    expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
  });
});
