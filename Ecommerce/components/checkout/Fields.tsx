"use client"

// Campo de formulario con error por campo (validacion de cliente) bajo el control.
import { AlertCircle, ChevronDown } from "lucide-react"
import type { ReactNode } from "react"

interface FieldProps {
  id: string
  label: string
  optional?: boolean
  error?: string
  hint?: string
  children: ReactNode
}

export const Field = ({ id, label, optional, error, hint, children }: FieldProps) => (
  <div className={error ? "fld err" : "fld"}>
    <label htmlFor={id}>{label}{optional ? <span className="opt">Opcional</span> : null}</label>
    {children}
    {error
      ? <p className="ferr" id={`${id}-e`}><AlertCircle className="ck-ic" aria-hidden /><span>{error}</span></p>
      : hint ? <p className="hint">{hint}</p> : null}
  </div>
)

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "email" | "tel"
  placeholder?: string
  optional?: boolean
  error?: string
  hint?: string
  inputMode?: "numeric"
  maxLength?: number
  autoComplete?: string
}

export const TextField = ({ id, label, value, onChange, type = "text", placeholder, optional, error, hint, inputMode, maxLength, autoComplete }: TextFieldProps) => (
  <Field id={id} label={label} optional={optional} error={error} hint={hint}>
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      maxLength={maxLength}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-e` : undefined}
    />
  </Field>
)

interface SelectFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder?: string
  error?: string
  ariaLabel?: string
}

export const SelectField = ({ id, label, value, onChange, options, placeholder = "Seleccionar", error, ariaLabel }: SelectFieldProps) => (
  <Field id={id} label={label} error={error}>
    <div className="selw">
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-e` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="ck-ic" aria-hidden />
    </div>
  </Field>
)
