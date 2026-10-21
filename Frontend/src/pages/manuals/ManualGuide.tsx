import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import type { ManualGuide as Guide } from "./manualData"
import { ACCESS_GUIDE_TITLE, ACCESS_PATH } from "./manualProfile"

/** Tarjeta de guía con pasos numerados; «Solicitar acceso a otra área» enlaza de verdad en su primer paso. */
export function ManualGuide({ guide, wide }: { guide: Guide; wide: boolean }) {
  const linked = guide.title === ACCESS_GUIDE_TITLE
  const cols = wide && guide.steps.length >= 6
  return (
    <article className={`card${wide ? " wide" : ""}`}>
      <h3>{guide.title}</h3>
      <ol className={`steps${cols ? " cols" : ""}`}>
        {guide.steps.map((step, i) => {
          const n = <span className="n" aria-hidden="true">{i + 1}</span>
          if (linked && i === 0) {
            return (
              <li key={step} className="lkli">
                <Link className="lk" to={ACCESS_PATH}>{n}<span>{step}</span><ChevronRight className="ic" size={18} strokeWidth={1.75} aria-hidden="true" /></Link>
              </li>
            )
          }
          return <li key={step}>{n}<span>{step}</span></li>
        })}
      </ol>
    </article>
  )
}
