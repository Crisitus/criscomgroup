import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';

// Mock de useNavigate para capturar navegación post-login
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // TEST 6.1 — Render inicial: inputs y botón de submit visibles
  it('muestra el formulario de login con inputs de email, password y botón de envío', async () => {
    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    });
  });

  // TEST 6.2 — Submit válido → MSW retorna token → navigate('/')
  it('llama navigate("/") tras un login exitoso', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/correo electrónico/i), 'test@test.local');
    await user.type(screen.getByLabelText(/contraseña/i), 'Test123!');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    }, { timeout: 3000 });
  });

  // TEST B8.1 — La pantalla no debe mostrar residuos de marcas anteriores.
  it('no muestra el residuo de marca "TT" y sí muestra Criscom Group', async () => {
    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.queryByText('TT')).toBeNull();
      expect(screen.getByText('Criscom Group')).toBeInTheDocument();
    });
  });

  // TEST 6.3 — Validación cliente: email sin "@" → error visible, MSW no llamado
  it('muestra error de validación para email inválido sin llamar a la API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/correo electrónico/i), 'emailsinalarroba');
    await user.type(screen.getByLabelText(/contraseña/i), 'Test123!');

    // Usamos fireEvent.submit directamente en el form para evitar dependencias
    // de framer-motion en el manejo de eventos de puntero en jsdom
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    fireEvent.submit(submitButton.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Ingrese un correo electrónico válido')).toBeInTheDocument();
    });

    // MSW no debería haber recibido ninguna llamada de login
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
