"use client"

// Seccion 2 - Entrega: tarjetas-radio domicilio/recojo + cotizacion real de envio.
import { Info, Loader, MapPin, Store, Truck } from "lucide-react"
import RadioCard from "./RadioCard"
import { TextField } from "./Fields"
import { money, type Quote } from "./checkoutShared"
import type { ConfigPublica } from "@/services/configPublicaService"
import type { CheckoutErrors, CheckoutForm } from "./CheckoutPage"

interface Props {
  form: CheckoutForm
  errors: CheckoutErrors
  update: <K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => void
  quote: Quote | null
  quoteLoading: boolean
  quoteError: string
  config: ConfigPublica | null
}

const QuoteBox = ({ quote, loading, error }: { quote: Quote | null; loading: boolean; error: string }) => {
  if (loading) {
    return (
      <div className="quote" role="status" aria-live="polite">
        <span className="qi"><Loader className="ck-ic spin" aria-hidden /></span>
        <div className="skl"><b>Cotizando tu envío…</b><i className="sk w60" /><i className="sk w35" /></div>
      </div>
    )
  }
  if (quote) {
    return (
      <div className="quote" role="status">
        <span className="qi"><Truck className="ck-ic" aria-hidden /></span>
        <div>
          <b className="tn">Envío cotizado · {money(quote.amount)}</b>
          <small>{quote.distance_km != null ? `${quote.distance_km} km desde la tienda` : "Tarifa según tu dirección"}</small>
        </div>
      </div>
    )
  }
  if (error) return null // el 422 se muestra bajo el campo direccion
  return (
    <p className="note">
      <Info className="ck-ic" aria-hidden />
      <span>Con departamento, provincia, distrito y dirección calculamos el envío. Mientras tanto no se suma al total.</span>
    </p>
  )
}

const DeliverySection = ({ form, errors, update, quote, quoteLoading, quoteError, config }: Props) => {
  const domicilio = form.tipo_entrega === "domicilio"
  return (
    <section className="card" id="ck-entrega" aria-labelledby="ck-entrega-t">
      <h2 className="sh" id="ck-entrega-t"><span className="numball" aria-hidden>2</span>Entrega</h2>
      <div className="opts c2" role="radiogroup" aria-label="Tipo de entrega">
        <RadioCard
          name="tipo_entrega" value="domicilio" icon={Truck}
          title="Envío a domicilio" sub="Se cotiza por tu dirección"
          checked={domicilio} onChange={(v) => update("tipo_entrega", v as CheckoutForm["tipo_entrega"])}
        />
        <RadioCard
          name="tipo_entrega" value="recojo_tienda" icon={Store}
          title="Recojo en tienda" sub="S/ 0.00 · sin costo de envío"
          checked={!domicilio} onChange={(v) => update("tipo_entrega", v as CheckoutForm["tipo_entrega"])}
        />
      </div>

      {domicilio ? (
        <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
          <div className="row3">
            <TextField id="ck-dep" label="Departamento" placeholder="Arequipa"
              value={form.direccion_departamento || ""} error={errors.direccion_departamento}
              onChange={(v) => update("direccion_departamento", v)} />
            <TextField id="ck-prov" label="Provincia" placeholder="Arequipa"
              value={form.direccion_provincia || ""} error={errors.direccion_provincia}
              onChange={(v) => update("direccion_provincia", v)} />
            <TextField id="ck-dis" label="Distrito" placeholder="Miraflores"
              value={form.direccion_distrito || ""} error={errors.direccion_distrito}
              onChange={(v) => update("direccion_distrito", v)} />
          </div>
          <TextField id="ck-dir" label="Dirección" placeholder="Av. Principal 123"
            value={form.direccion_envio || ""} error={errors.direccion_envio}
            onChange={(v) => update("direccion_envio", v)} />
          <TextField id="ck-ref" label="Referencia" optional placeholder="Frente al parque, portón negro"
            value={form.direccion_referencia || ""}
            onChange={(v) => update("direccion_referencia", v)} />
          <QuoteBox quote={quote} loading={quoteLoading} error={quoteError} />
        </div>
      ) : (
        <div className="pick">
          <MapPin className="ck-ic" aria-hidden />
          <div>
            <b>{config?.nombre_comercial || "Tienda Criscom Group"}</b>
            {config?.direccion ? <p>{config.direccion}</p> : null}
            {config?.horario?.inicio && config?.horario?.fin
              ? <p>Horario de atención {config.horario.inicio}–{config.horario.fin}</p>
              : null}
          </div>
        </div>
      )}
    </section>
  )
}

export default DeliverySection
