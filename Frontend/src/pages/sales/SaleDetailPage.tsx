"use client"

import "../../styles/detalle.css"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, Banknote, CircleCheck, CircleX, Clock, FileText, Loader, Lock, Printer, Send, Smartphone, TriangleAlert, type LucideIcon } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import TicketViewer from "../../components/ticket-viewer"
import { dateTimeLima, money } from "../../components/erp/format"
import { confirmPosPayment, emitElectronicDocument, fetchSaleById, generateSaleTicket, type Sale } from "../../services/saleService"
import { fetchCompanyForSales } from "../../services/companyService"
import { getInvoicePdf, prepareInvoiceData } from "../../services/invoiceService"
import { fetchUserBasicInfo } from "../../services/userService"
import { generateFileName } from "../../utils/openDocument"

const stroke = { strokeWidth: 1.75, "aria-hidden": true } as const
type Tone = "ok" | "warn" | "bad" | "neu"
const TIPO: Record<string, string> = { "0": "Nota de venta", "3": "Boleta", "1": "Factura" }
const METODO: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", yape: "Yape", plin: "Plin", transferencia: "Transferencia", pago_link: "Pago por link" }
const CANAL: Record<string, string> = { pos: "POS", qr: "QR", link: "Enlace de pago" }
const DOC: Record<string, string> = { "1": "DNI", "6": "RUC" }
const EST: Record<string, { t: string; k: Tone; i: LucideIcon }> = {
  sin_emitir: { t: "Sin emitir", k: "neu", i: FileText }, pendiente: { t: "Pendiente", k: "warn", i: Clock }, aceptado: { t: "Aceptado", k: "ok", i: CircleCheck }, rechazado: { t: "Rechazado", k: "bad", i: CircleX }, error: { t: "Error", k: "bad", i: TriangleAlert },
}
const PAGO: Record<string, { t: string; k: Tone; i: LucideIcon }> = {
  pendiente_confirmacion: { t: "Pendiente de confirmación", k: "warn", i: Clock }, confirmado: { t: "Confirmado", k: "ok", i: CircleCheck }, anulado: { t: "Anulado", k: "bad", i: CircleX },
}
const Chip = ({ e, size = 16 }: { e: { t: string; k: Tone; i: LucideIcon }; size?: number }) => <span className={`st ${e.k}`}><e.i size={size} {...stroke} /><span>{e.t}</span></span>
const plu = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`
const charged = (s: Sale) => Math.round((Number(s.total_con_igv) - (s.es_descuento && s.descuento ? Number(s.descuento) : 0)) * 100) / 100
const docNo = (s: Sale) => (s.serie && s.correlativo ? `${s.serie}-${String(s.correlativo).padStart(8, "0")}` : `N.º ${s.venta_id}`)
const estadoOf = (s: Sale) => s.estado_comprobante ?? (!s.tipo_documento || s.tipo_documento === "0" ? "sin_emitir" : s.comprobante_emitido ? "aceptado" : "pendiente")

type ActionId = "confirmar" | "sunat" | "imprimir" | "comprobante"
interface Act { id: ActionId; l: string; i: LucideIcon; dis?: boolean; why?: string }

function actionsFor(s: Sale, role: number, sending: boolean) {
  const est = estadoOf(s), pos = s.pago_pos, need: Act[] = []
  let blocked: Act | null = null
  if (pos?.estado === "pendiente_confirmacion") {
    const b: Act = { id: "confirmar", l: "Confirmar pago", i: CircleCheck }
    if (role === 1) need.push(b); else blocked = { ...b, dis: true, why: "Solo el Gerente puede confirmar pagos POS." }
  }
  if ((s.tipo_documento === "1" || s.tipo_documento === "3") && est !== "aceptado")
    need.push(sending ? { id: "sunat", l: "Enviando a SUNAT…", i: Loader, dis: true } : { id: "sunat", l: est === "rechazado" || est === "error" ? "Reintentar envío" : "Enviar a SUNAT", i: Send })
  const imp: Act = { id: "imprimir", l: "Imprimir ticket", i: Printer }
  const sec: Act[] = []
  if ((s.tipo_documento === "1" || s.tipo_documento === "3") && s.comprobante_emitido) sec.push({ id: "comprobante", l: `Ver ${TIPO[s.tipo_documento].toLowerCase()}`, i: FileText })
  if (need.length) return { primary: need[0], sec: [...need.slice(1), ...(blocked ? [blocked] : []), imp, ...sec] }
  return { primary: imp, sec: [...(blocked ? [blocked] : []), ...sec] }
}

const Dl = ({ rows }: { rows: Array<[string, React.ReactNode]> }) => (
  <dl className="dl">{rows.filter(r => r[1] != null && r[1] !== "").map(r => <div key={r[0]}><dt>{r[0]}</dt><dd>{r[1]}</dd></div>)}</dl>
)

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>()
  useDocumentTitle(`Detalle de venta #${id}`)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const role = user?.id_role ?? 3
  const [viewer, setViewer] = useState<{ html: string; blob: Blob | null; title: string; type: string } | null>(null)
  const [sending, setSending] = useState(false)

  const { data: sale, isLoading, error } = useQuery({ queryKey: ["sale", id], queryFn: () => fetchSaleById(Number(id)), retry: false })
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: fetchCompanyForSales })
  const { data: cashier } = useQuery({ queryKey: ["user", sale?.id_cajero], queryFn: () => fetchUserBasicInfo(sale!.id_cajero), enabled: !!sale, retry: 1, staleTime: 300_000 })
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["sale", id] }); void queryClient.invalidateQueries({ queryKey: ["sales"] }) }
  const confirm = useMutation({ mutationFn: () => confirmPosPayment(Number(id)), onSuccess: () => { toast.success("Pago confirmado"); refresh() }, onError: () => toast.error("No se pudo confirmar el pago") })

  const back = () => navigate("/sales")
  const forbidden = (error as { response?: { status?: number } } | null)?.response?.status === 403 || (error as { response?: { status?: number } } | null)?.response?.status === 404

  if (isLoading) return <div className="pg-detalle"><div className="pg"><div className="hd"><h1>Venta</h1></div><div className="card"><div className="note neu" role="status">Cargando venta…</div></div></div></div>
  if (!sale || forbidden) {
    return (
      <div className="pg-detalle"><div className="pg">
        <div className="hd"><h1>Venta no disponible</h1><div className="acts"><button type="button" className="btn out" onClick={back}><ArrowLeft size={18} {...stroke} /><span>Volver</span></button></div></div>
        <section className="card deny" role="alert"><div className="box"><div className="dic"><Lock size={22} {...stroke} /></div><h3 style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>No tienes acceso a esta venta</h3><p>Solo puedes ver las ventas a las que tu rol tiene acceso.</p><div className="acts" style={{ margin: "16px 0 0" }}><button type="button" className="btn" onClick={back}><ArrowLeft size={18} {...stroke} /><span>Volver al Historial</span></button></div></div></section>
      </div></div>
    )
  }

  const tipo = sale.tipo_documento ?? "0"
  const est = EST[estadoOf(sale)], pos = sale.pago_pos
  const details = sale.detalles ?? []
  const units = details.reduce((s, d) => s + d.cantidad, 0)
  const igv = Math.round((Number(sale.total_con_igv) - Number(sale.total)) * 100) / 100
  const { primary, sec } = actionsFor(sale, role, sending)

  const printTicket = async () => {
    try { const r = await generateSaleTicket(sale.venta_id); setViewer({ html: r.html, blob: null, title: `Ticket #${sale.venta_id}`, type: "Ticket" }) } catch { toast.error("No se pudo generar el ticket") }
  }
  const viewInvoice = async () => {
    if (!company) return toast.error("No hay datos de la empresa para generar el comprobante")
    try {
      const withItems = { ...sale, items: details.map(d => ({ producto_id: d.producto_id, nombre: (d as { producto?: { nombre?: string } }).producto?.nombre || `Producto #${d.producto_id}`, precio_unitario: d.precio_unitario, precio_unitario_con_igv: d.precio_unitario_con_igv, cantidad: d.cantidad })) }
      const client = sale.cliente ? { tipoDocumento: sale.cliente.tipoDoc || sale.cliente_tipo_documento || "1", numeroDocumento: sale.cliente.numDoc || sale.cliente_numero_documento || "", nombre: sale.cliente.nombre || sale.cliente_nombre || "", direccion: sale.cliente.direccion || "", email: sale.cliente.email || "" } : null
      const code = tipo === "1" ? "01" : "03"
      const result = await getInvoicePdf(prepareInvoiceData(withItems, company, code, client, { facturaActual: 1, boletaActual: 1 }))
      const title = `${TIPO[tipo]} #${sale.venta_id}`
      setViewer(typeof result === "string" ? { html: result, blob: null, title, type: TIPO[tipo] } : { html: "", blob: result, title, type: TIPO[tipo] })
    } catch (e) { toast.error((e as Error).message || "No se pudo generar el comprobante") }
  }
  const sendSunat = async () => {
    setSending(true)
    try {
      const r = await emitElectronicDocument(sale.venta_id)
      toast.success(r.sandbox ? "XML validado en sandbox; no se envió a SUNAT" : `SUNAT aceptó la ${TIPO[tipo].toLowerCase()} ${docNo(sale)}`)
    } catch (e) { toast.error("No se pudo emitir el comprobante", { description: (e as { response?: { data?: { message?: string } } }).response?.data?.message }) } finally { setSending(false); refresh() }
  }
  const run = (a: Act) => { if (a.dis) return; if (a.id === "confirmar") confirm.mutate(); else if (a.id === "sunat") void sendSunat(); else if (a.id === "imprimir") void printTicket(); else void viewInvoice() }

  const Btn = ({ a, cls }: { a: Act; cls?: string }) => (
    <button type="button" className={`btn${cls ?? ""}`} aria-disabled={a.dis || undefined} aria-describedby={a.why ? "aviso-detalle" : undefined} onClick={() => run(a)}><a.i size={18} className={a.i === Loader ? "spin" : undefined} {...stroke} /><span>{a.l}</span></button>
  )

  // Aviso de una línea según el estado
  let note: { k: Tone; i: LucideIcon; h: React.ReactNode } | null = null
  if (sending) note = { k: "neu", i: Loader, h: <><b>Enviando a SUNAT…</b> Espera el resultado antes de salir de esta ficha.</> }
  else if (pos?.estado === "pendiente_confirmacion") {
    const m = pos.monto_centimos / 100, tc = charged(sale), d = Math.abs(m - tc)
    note = { k: "warn", i: Clock, h: <><b>Pago por confirmar.</b> {METODO[sale.metodo_pago]} ({CANAL[pos.canal]} · {pos.adquirente?.nombre}) registrado por {money(m)}{d > 0.005 ? `; el total cobrado es ${money(tc)} (diferencia ${money(d)}).` : "."}{role !== 1 ? " Solo el Gerente puede confirmarlo." : ""}</> }
  } else if (estadoOf(sale) === "rechazado") note = { k: "bad", i: CircleX, h: <><b>SUNAT rechazó {tipo === "1" ? "esta factura" : "este comprobante"}.</b> Puedes reintentar el envío.</> }
  else if (estadoOf(sale) === "error") note = { k: "bad", i: TriangleAlert, h: <><b>El envío a SUNAT falló.</b> Puedes reintentar el envío.</> }
  else if (estadoOf(sale) === "pendiente" && (tipo === "1" || tipo === "3")) note = { k: "warn", i: Clock, h: <><b>Comprobante pendiente.</b> Aún no se envió a SUNAT.</> }

  const payTone = pos ? <Chip e={PAGO[pos.estado]} /> : <span className="st neu">{sale.metodo_pago === "efectivo" ? <Banknote size={16} {...stroke} /> : <Smartphone size={16} {...stroke} />}<span>{METODO[sale.metodo_pago]}</span></span>
  const filename = generateFileName({ tipoDocumento: tipo === "1" ? "01" : "03", correlativoReal: sale.correlativo || sale.venta_id, clienteData: sale.cliente_numero_documento ? { numeroDocumento: sale.cliente_numero_documento, tipoDocumento: sale.cliente_tipo_documento || "1", nombre: sale.cliente_nombre || "" } : null })

  return (
    <div className="pg-detalle">
      <div className="pg">
        <div className="hd">
          <h1>{TIPO[tipo]} {docNo(sale)}</h1>
          <div className="acts">
            <button type="button" className="btn gh erp-only-desk" onClick={back}><ArrowLeft size={18} {...stroke} /><span>Volver</span></button>
            <button type="button" className="ib erp-only-mob" aria-label="Volver al Historial de ventas" onClick={back}><ArrowLeft size={20} {...stroke} /></button>
            <span className="erp-only-desk" style={{ display: "contents" }}>{sec.map(a => <Btn key={a.id} a={a} cls=" out" />)}<Btn a={primary} /></span>
          </div>
        </div>
        {note && <div className={`note ${note.k}`} id="aviso-detalle" role={sending ? "status" : undefined}><note.i size={18} className={note.i === Loader ? "spin" : undefined} {...stroke} /><div>{note.h}</div></div>}

        <section className="sum" aria-label="Resumen de la venta">
          <div className="cell"><div className="l">Total cobrado</div><div className="v big num">{money(charged(sale))}</div><div className="s">{plu(details.length, "producto", "productos")} · {plu(units, "unidad", "unidades")}</div></div>
          <div className="cell"><div className="l">Comprobante</div><div className="v"><Chip e={est} /></div><div className="s">{TIPO[tipo]}</div></div>
          <div className="cell"><div className="l">Pago</div><div className="v">{payTone}</div><div className="s">{pos ? `${METODO[sale.metodo_pago]} · ${CANAL[pos.canal]} · ${pos.adquirente?.nombre ?? ""}` : ""}</div></div>
          <div className="cell"><div className="l">Fecha</div><div className="v">{dateTimeLima(sale.fecha).split(" ")[0]}</div><div className="s">{dateTimeLima(sale.fecha).split(" ").slice(1).join(" ")} · Venta N.º {sale.venta_id}</div></div>
        </section>

        <div className="body">
          <div className="col">
            <section className="card" aria-label="Productos">
              <h2>Productos <small>Importes con IGV incluido</small></h2>
              <div className="tr th erp-only-desk" role="row"><span>Producto</span><span className="r">Cant.</span><span className="r">Precio unit.</span><span className="r">Subtotal</span></div>
              {details.map(d => {
                const name = (d as { producto?: { nombre?: string; sku?: string } }).producto?.nombre ?? `Producto #${d.producto_id}`
                const sku = (d as { producto?: { sku?: string } }).producto?.sku
                const tags = [d.es_venta_mayorista && "Mayorista", (d as { condicion?: string }).condicion === "segunda_mano" && "Segunda mano"].filter(Boolean) as string[]
                const sub = `${sku ? `SKU ${sku} · ` : ""}Garantía ${(d as { garantia_meses?: number }).garantia_meses ?? 12} meses${(d as { estado_observaciones?: string }).estado_observaciones ? ` · ${(d as { estado_observaciones?: string }).estado_observaciones}` : ""}`
                return (
                  <div key={d.detalle_id}>
                    <div className="tr erp-only-desk" role="row"><div><div className="pn">{name}</div><div className="ps">{sub}</div>{tags.length > 0 && <div className="tags">{tags.map(t => <span key={t} className="tag">{t}</span>)}</div>}</div><span className="r num">{d.cantidad}</span><span className="r num">{money(Number(d.precio_unitario_con_igv))}</span><b className="r num">{money(Number(d.subtotal_con_igv))}</b></div>
                    <div className="pc erp-only-mob"><div className="pn">{name}</div><div className="ps">{sub}</div>{tags.length > 0 && <div className="tags">{tags.map(t => <span key={t} className="tag">{t}</span>)}</div>}<div className="q num"><span>{d.cantidad} × {money(Number(d.precio_unitario_con_igv))}</span><b>{money(Number(d.subtotal_con_igv))}</b></div></div>
                  </div>
                )
              })}
              <div className="tot num">
                <div className="row"><span>Subtotal</span><span>{money(Number(sale.total))}</span></div>
                <div className="row"><span>IGV (18 %)</span><span>{money(igv)}</span></div>
                {sale.es_descuento && sale.descuento ? <div className="row g"><span>Descuento <span className="tag">Oferta</span></span><span className="num">− {money(Number(sale.descuento))}</span></div> : null}
                <div className="final"><span>Total cobrado</span><b>{money(charged(sale))}</b></div>
              </div>
            </section>
          </div>
          <div className="col">
            <section className="card" aria-label="Pago"><h2>Pago</h2>
              <Dl rows={[
                ["Método", <><span className="tag">{METODO[sale.metodo_pago]}</span>{pos && <> <Chip e={PAGO[pos.estado]} size={14} /></>}</>],
                ...(pos ? ([
                  ["Canal", `${CANAL[pos.canal]} · ${pos.adquirente?.nombre ?? ""}${pos.adquirente?.marca ? ` (${pos.adquirente.marca})` : ""}`],
                  ["N.º operación", <span className="num">{pos.numero_operacion}</span>],
                  ["Monto registrado", <span className="num">{money(pos.monto_centimos / 100)}</span>],
                  ["Confirmado", pos.confirmado_en ? dateTimeLima(pos.confirmado_en) : null],
                ] as Array<[string, React.ReactNode]>) : []),
              ]} />
            </section>
            <section className="card" aria-label="Cliente"><h2>Cliente</h2>
              <Dl rows={sale.cliente_nombre ? [["Nombre", sale.cliente_nombre], [DOC[sale.cliente_tipo_documento ?? "1"] ?? "Documento", <span className="num">{sale.cliente_numero_documento}</span>], ["Dirección", (sale as { cliente_direccion?: string }).cliente_direccion], ["Correo", (sale as { cliente_email?: string }).cliente_email]] : [["Nombre", "Sin cliente"]]} />
            </section>
            <section className="card" aria-label="Venta"><h2>Venta</h2>
              <Dl rows={[["Cajero", cashier?.name ?? `Cajero ID: ${sale.id_cajero}`], ["Observaciones", sale.observaciones], ["Garantía", (sale as { garantia_texto?: string }).garantia_texto]]} />
            </section>
            {Number((sale as { comision_porcentaje?: string }).comision_porcentaje) > 0 && (
              <section className="card" aria-label="Comisión"><h2>Comisión</h2>
                <Dl rows={[["Porcentaje", `${(sale as { comision_porcentaje?: string }).comision_porcentaje} %`], ["Comisión", money(Number((sale as { comision_servicio?: string }).comision_servicio))], ["Neto vendedor", money(Number((sale as { neto_vendedor?: string }).neto_vendedor))]]} />
              </section>
            )}
          </div>
        </div>
        <div className="erp-only-mob" style={{ position: "sticky", bottom: 0, display: "flex", gap: 8, padding: "8px 0 0", background: "hsl(var(--main-bg))" }}>
          <div style={{ flex: 1, minWidth: 0 }}><Btn a={primary} /></div>
          {sec.filter(a => a.id === "imprimir" && primary.id !== "imprimir").map(a => <button key={a.id} type="button" className="ib" aria-label={a.l} onClick={() => run(a)}><Printer size={20} {...stroke} /></button>)}
        </div>
      </div>

      <TicketViewer isOpen={!!viewer} onClose={() => setViewer(null)} htmlContent={viewer?.html ?? ""} pdfBlob={viewer?.blob ?? null} title={viewer?.title} documentType={viewer?.type} fileName={filename} />
    </div>
  )
}
