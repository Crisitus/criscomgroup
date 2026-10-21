"use client"

// Seccion 1 - Contacto: nombre, correo, telefono y documento opcional.
import { ChevronDown } from "lucide-react"
import { Field, TextField } from "./Fields"
import type { CheckoutErrors, CheckoutForm } from "./CheckoutPage"

const DOC_TIPOS = [
  { value: "DNI", label: "DNI" },
  { value: "RUC", label: "RUC" },
  { value: "CE", label: "Carné de extranjería" },
] as const

interface Props {
  form: CheckoutForm
  errors: CheckoutErrors
  update: <K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => void
}

const ContactSection = ({ form, errors, update }: Props) => (
  <section className="card" id="ck-contacto" aria-labelledby="ck-contacto-t">
    <h2 className="sh" id="ck-contacto-t"><span className="numball" aria-hidden>1</span>Contacto</h2>
    <div className="row2">
      <TextField
        id="ck-nombre" label="Nombre completo" autoComplete="name"
        placeholder="Como figura en tu documento"
        value={form.cliente_nombre} error={errors.cliente_nombre}
        onChange={(v) => update("cliente_nombre", v)}
      />
      <TextField
        id="ck-email" label="Correo electrónico" type="email" autoComplete="email"
        placeholder="tucorreo@ejemplo.com"
        value={form.cliente_email} error={errors.cliente_email}
        onChange={(v) => update("cliente_email", v)}
      />
      <TextField
        id="ck-tel" label="Teléfono" type="tel" autoComplete="tel"
        placeholder="+51 900 000 000"
        value={form.cliente_telefono} error={errors.cliente_telefono}
        onChange={(v) => update("cliente_telefono", v)}
      />
      <Field id="ck-docn" label="Documento" optional>
        <div className="doc">
          <div className="selw">
            <select
              aria-label="Tipo de documento"
              value={form.cliente_documento_tipo || ""}
              onChange={(e) => update("cliente_documento_tipo", e.target.value as CheckoutForm["cliente_documento_tipo"])}
            >
              <option value="">Seleccionar</option>
              {DOC_TIPOS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <ChevronDown className="ck-ic" aria-hidden />
          </div>
          <input
            id="ck-docn" name="docn" type="text" inputMode="numeric" maxLength={12}
            placeholder="Número"
            value={form.cliente_documento_numero || ""}
            onChange={(e) => update("cliente_documento_numero", e.target.value)}
          />
        </div>
      </Field>
    </div>
  </section>
)

export default ContactSection
