"use client"

// Seccion 4 - Comprobante: boleta | factura (factura despliega RUC + razon social).
// Seccion 5 - Notas del pedido (plegada, opcional).
import { FileText } from "lucide-react"
import RadioCard from "./RadioCard"
import { TextField } from "./Fields"
import type { CheckoutErrors, CheckoutForm } from "./CheckoutPage"

interface Props {
  form: CheckoutForm
  errors: CheckoutErrors
  update: <K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => void
}

export const ReceiptSection = ({ form, errors, update }: Props) => {
  const factura = form.tipo_comprobante === "factura"
  const pick = (v: string) => {
    const esFactura = v === "factura"
    update("tipo_comprobante", v as CheckoutForm["tipo_comprobante"])
    update("requiere_factura", esFactura)
    update("cliente_documento_tipo", esFactura ? "RUC" : form.cliente_documento_tipo)
  }
  return (
    <section className="card" id="ck-comprobante" aria-labelledby="ck-comprobante-t">
      <h2 className="sh" id="ck-comprobante-t"><span className="numball" aria-hidden>4</span>Comprobante</h2>
      <div className="opts c2" role="radiogroup" aria-label="Tipo de comprobante">
        <RadioCard
          name="tipo_comprobante" value="boleta" icon={FileText}
          title="Boleta" sub="Con tus datos de contacto"
          checked={!factura} onChange={pick}
        />
        <RadioCard
          name="tipo_comprobante" value="factura" icon={FileText}
          title="Factura" sub="Con RUC y razón social"
          checked={factura} onChange={pick}
        />
      </div>
      {factura ? (
        <div className="row2" style={{ marginTop: 20 }}>
          <TextField
            id="ck-ruc" label="RUC" inputMode="numeric" maxLength={11}
            placeholder="11 dígitos" hint={errors.ruc ? undefined : "11 dígitos"}
            value={form.cliente_documento_numero || ""} error={errors.ruc}
            onChange={(v) => { update("cliente_documento_tipo", "RUC"); update("cliente_documento_numero", v.replace(/\D/g, "")) }}
          />
          <TextField
            id="ck-razon" label="Razón social" placeholder="Como figura en la SUNAT"
            value={form.razon_social || ""} error={errors.razon_social}
            onChange={(v) => update("razon_social", v)}
          />
        </div>
      ) : null}
    </section>
  )
}

export const NotesSection = ({ form, update }: Pick<Props, "form" | "update">) => (
  <details className="card" id="ck-notas">
    <summary>
      <span className="numball" aria-hidden>5</span>
      <span style={{ flex: 1 }}>Notas del pedido<span className="opt">Opcional</span></span>
      <svg className="ck-ic chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <div className="body">
      <textarea
        aria-label="Notas para tu pedido"
        placeholder="Indicaciones para la entrega o el comprobante"
        value={form.notas_cliente || ""}
        onChange={(e) => update("notas_cliente", e.target.value)}
      />
    </div>
  </details>
)
