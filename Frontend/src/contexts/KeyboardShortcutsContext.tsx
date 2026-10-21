import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Definir los atajos por defecto
const DEFAULT_SHORTCUTS = {
  'dashboard': { keys: 'alt+d', description: 'Ir al Dashboard' },
  'products': { keys: 'alt+p', description: 'Ir a Productos' },
  'categories': { keys: 'alt+c', description: 'Ir a Categorías' },
  'sales': { keys: 'alt+s', description: 'Ir a Ventas' },
  'company': { keys: 'alt+e', description: 'Ir a Empresa' },
  'newSale': { keys: 'alt+n', description: 'Nueva Venta' },
  'toggleSidebar': { keys: 'alt+b', description: 'Mostrar/Ocultar Sidebar' },
  'toggleTheme': { keys: 'alt+t', description: 'Cambiar Tema' },
  'logout': { keys: 'alt+q', description: 'Cerrar Sesión' },
  'help': { keys: '?', description: 'Mostrar Ayuda de Atajos' }
};

type ShortcutConfig = {
  keys: string;
  description: string;
};

type Shortcuts = Record<string, ShortcutConfig>;

interface KeyboardShortcutsContextType {
  shortcuts: Shortcuts;
  updateShortcut: (id: string, newConfig: ShortcutConfig) => void;
  resetToDefaults: () => void;
  showShortcutModal: boolean;
  setShowShortcutModal: (show: boolean) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export const KeyboardShortcutsProvider = ({ children }: { children: React.ReactNode }) => {
  const [shortcuts, setShortcuts] = useState<Shortcuts>(() => {
    // Cargar atajos guardados o usar los predeterminados
    const saved = localStorage.getItem('keyboardShortcuts');
    return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
  });
  
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const navigate = useNavigate();

  // Guardar cambios en localStorage
  useEffect(() => {
    localStorage.setItem('keyboardShortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  const updateShortcut = (id: string, newConfig: ShortcutConfig) => {
    setShortcuts(prev => ({
      ...prev,
      [id]: newConfig
    }));
  };

  const resetToDefaults = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
  };

  // Manejar las teclas presionadas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // No capturar atajos cuando se está escribiendo en inputs o textareas
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Mostrar modal de ayuda
      if (e.key === '?' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        setShowShortcutModal(true);
        e.preventDefault();
        return;
      }

      // Construir la combinación de teclas actual
      const pressedCombo = [];
      if (e.altKey) pressedCombo.push('alt');
      if (e.ctrlKey) pressedCombo.push('ctrl');
      if (e.shiftKey) pressedCombo.push('shift');
      if (e.metaKey) pressedCombo.push('meta');
      
      // Solo agregar la tecla principal si no es una tecla modificadora
      if (!['Alt', 'Control', 'Shift', 'Meta'].includes(e.key)) {
        pressedCombo.push(e.key.toLowerCase());
      }

      const combo = pressedCombo.join('+');

      // Verificar si coincide con algún atajo configurado
      Object.entries(shortcuts).forEach(([action, config]) => {
        if (config.keys.toLowerCase() === combo) {
          e.preventDefault();
            // Ejecutar la acción correspondiente
          switch (action) {
            case 'dashboard':
              navigate('/');
              break;
            case 'products':
              navigate('/products');
              break;
            case 'categories':
              navigate('/categories');
              break;
            case 'sales':
              navigate('/sales');
              break;
            case 'company':
              navigate('/company');
              break;
            case 'newSale':
              navigate('/sales/new');
              break;
            case 'toggleSidebar':
              // Esta función se manejará con un callback desde DashboardLayout
              window.dispatchEvent(new CustomEvent('toggleSidebar'));
              break;            case 'toggleTheme':
              window.dispatchEvent(new CustomEvent('toggleTheme'));
              break;
            case 'logout':
              window.dispatchEvent(new CustomEvent('logoutRequested'));
              break;
            case 'help':
              setShowShortcutModal(true);
              break;
          }
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, navigate]);

  return (
    <KeyboardShortcutsContext.Provider value={{ 
      shortcuts, 
      updateShortcut, 
      resetToDefaults,
      showShortcutModal,
      setShowShortcutModal
    }}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
};