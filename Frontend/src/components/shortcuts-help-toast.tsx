// src/components/shortcuts-help-toast.tsx
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

export function ShortcutsHelpToast() {
  const location = useLocation();

  useEffect(() => {
    // Mostrar toast con atajos relevantes al cambiar de página
    const path = location.pathname;
    
    let message = 'Presiona ? para ver todos los atajos de teclado';
    
    // Personalizar el mensaje según la página
    if (path === '/') {
      message = 'Alt+D: Dashboard | Alt+P: Productos | Alt+S: Ventas';
    } else if (path.includes('/products')) {
      message = 'Alt+P: Productos | Alt+C: Categorías | Alt+N: Nueva venta';
    } else if (path.includes('/sales')) {
      message = 'Alt+S: Ventas | Alt+N: Nueva venta';
    }
    
    // Mostrar toast
    toast.info(message, {
      duration: 3000,
      position: 'bottom-center',
    });
    
  }, [location]);

  return null;
}