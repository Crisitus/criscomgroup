/** Único h1 de la pestaña: el contenedor solo pone un <p> en esta pestaña. La línea de contexto va en la misma fila. */
export function PagHeader({ ctx }: { ctx: string }) {
  return <div className="pa-hd"><h1>Pagos y POS</h1>{ctx && <span className="pa-ctx">{ctx}</span>}</div>
}
