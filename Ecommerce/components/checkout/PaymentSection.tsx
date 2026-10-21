"use client"

// Seccion 3 - Pago: 5 tarjetas-radio con la consecuencia exacta por metodo.
import { Banknote, Clock, CreditCard, Info, Landmark, Smartphone } from "lucide-react"
import RadioCard from "./RadioCard"
import type { LucideIcon } from "lucide-react"
import type { MetodoPago } from "./checkoutShared"

const METODOS: { value: MetodoPago; icon: LucideIcon; title: string; sub: string }[] = [
  { value: "yape", icon: Smartphone, title: "Yape", sub: "Queda pendiente de validación en el ERP. Te contactamos por WhatsApp." },
  { value: "plin", icon: Smartphone, title: "Plin", sub: "Queda pendiente de validación en el ERP. Te contactamos por WhatsApp." },
  { value: "transferencia", icon: Landmark, title: "Transferencia bancaria", sub: "Queda pendiente de validación en el ERP." },
  { value: "tarjeta", icon: CreditCard, title: "Tarjeta de crédito o débito", sub: "Se abrirá Culqi para pagar. CRISCOM no almacena tu tarjeta." },
  { value: "contraentrega", icon: Banknote, title: "Contraentrega", sub: "Pagas al recibir tu pedido." },
]

const PayNote = ({ metodo }: { metodo: MetodoPago }) => {
  if (metodo === "tarjeta") {
    return (
      <>
        <p className="note">
          <CreditCard className="ck-ic" aria-hidden />
          <span>Al confirmar se abrirá Culqi para completar el pago. CRISCOM nunca almacena número ni CVV de tu tarjeta.</span>
        </p>
        <p className="note">
          <Info className="ck-ic" aria-hidden />
          <span>Recargo por tarjeta: 5 % solo sobre productos afiliados, calculado por el servidor.</span>
        </p>
      </>
    )
  }
  if (metodo === "contraentrega") return null
  return (
    <p className="note">
      <Clock className="ck-ic" aria-hidden />
      <span>Queda pendiente de validación del ERP: tu pedido pasa a «Pendiente de pago» hasta que se valide. Esta pantalla no valida ningún pago.</span>
    </p>
  )
}

interface Props {
  metodo: MetodoPago
  onChange: (metodo: MetodoPago) => void
}

const PaymentSection = ({ metodo, onChange }: Props) => (
  <section className="card" id="ck-pago" aria-labelledby="ck-pago-t">
    <h2 className="sh" id="ck-pago-t"><span className="numball" aria-hidden>3</span>Pago</h2>
    <div className="opts" role="radiogroup" aria-label="Método de pago">
      {METODOS.map((m) => (
        <RadioCard
          key={m.value}
          name="metodo_pago" value={m.value} icon={m.icon}
          title={m.title} sub={m.sub}
          checked={metodo === m.value}
          onChange={(v) => onChange(v as MetodoPago)}
        />
      ))}
    </div>
    <PayNote metodo={metodo} />
  </section>
)

export default PaymentSection
