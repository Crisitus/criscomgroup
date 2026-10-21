declare global { interface Window { CulqiCheckout?: new (publicKey: string, config: unknown) => any } }
let loading: Promise<void> | null = null
const load = () => {
  if (window.CulqiCheckout) return Promise.resolve()
  if (loading) return loading
  loading = new Promise<void>((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://js.culqi.com/checkout-js'; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error('No se pudo cargar Culqi')); document.head.appendChild(script) })
  return loading
}
export const requestCardToken = async (amount: number, email: string, publicKey?: string | null) => {
  await load(); if (!window.CulqiCheckout || !publicKey) throw new Error('Culqi no está configurado')
  return new Promise<string>((resolve, reject) => { const checkout = new window.CulqiCheckout!(publicKey, { settings: { title: 'CRISCOM GROUP', currency: 'PEN', amount: Math.round(amount * 100) }, client: { email }, options: { lang: 'es', modal: true, paymentMethods: { tarjeta: true } } }); checkout.culqi = () => { if (checkout.token?.id) { checkout.close(); resolve(checkout.token.id) } else { checkout.close(); reject(new Error(checkout.error?.user_message || 'Pago rechazado')) } }; checkout.open() })
}
