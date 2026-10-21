declare global {
  interface Window { CulqiCheckout?: new (publicKey: string, config: unknown) => CulqiCheckoutInstance }
}

interface CulqiCheckoutInstance {
  token?: { id?: string };
  error?: { user_message?: string };
  culqi: () => void;
  open: () => void;
  close: () => void;
}

let loadingPromise: Promise<void> | null = null;

export const loadCulqi = () => {
  if (window.CulqiCheckout) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-culqi-checkout]') as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', () => resolve(), { once: true }); return; }
    const script = document.createElement('script');
    script.src = 'https://js.culqi.com/checkout-js';
    script.async = true;
    script.dataset.culqiCheckout = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el checkout seguro de Culqi'));
    document.head.appendChild(script);
  });
  return loadingPromise;
};

interface CulqiOrderInfo {
  total_final: number | string;
  cliente_email: string;
}

export const requestCulqiToken = async (order: CulqiOrderInfo, publicKey?: string | null): Promise<string> => {
  await loadCulqi();
  if (!window.CulqiCheckout || !publicKey) throw new Error('Culqi aún no está configurado');
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let containerSeen = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      fn();
    };

    // Culqi Checkout no invoca el callback `culqi()` cuando el usuario cierra
    // el modal con la "X" (solo en éxito o error de la tarjeta). Detectamos ese
    // cierre observando la remoción de su contenedor (#culqi-js) del DOM.
    const observer = new MutationObserver(() => {
      const present = Boolean(document.getElementById('culqi-js'));
      if (present) { containerSeen = true; return; }
      if (containerSeen) settle(() => reject(new Error('Pago cancelado')));
    });

    const checkout = new window.CulqiCheckout!(publicKey, {
      settings: { title: 'Criscom Group', currency: 'PEN', amount: Math.round(Number(order.total_final) * 100) },
      client: { email: order.cliente_email },
      options: { lang: 'es', installments: true, modal: true, paymentMethods: { tarjeta: true }, paymentMethodsSort: ['tarjeta'] },
      appearance: { theme: 'default', menuType: 'sidebar', logo: `${window.location.origin}/logo.png`, defaultStyle: { bannerColor: '#071827', buttonBackground: '#06b6d4', menuColor: '#0891b2', linksColor: '#22d3ee', buttonTextColor: '#ffffff', priceColor: '#67e8f9' } }
    });

    checkout.culqi = () => {
      const tokenId = checkout.token?.id;
      const checkoutError = checkout.error;
      if (tokenId) settle(() => { checkout.close(); resolve(tokenId); });
      else if (checkoutError) settle(() => { checkout.close(); reject(new Error(checkoutError.user_message || 'Culqi rechazó los datos de pago')); });
    };

    observer.observe(document.body, { childList: true, subtree: true });
    checkout.open();
  });
};
