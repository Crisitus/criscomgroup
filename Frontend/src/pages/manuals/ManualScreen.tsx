import { ChevronRight, CircleCheck, ShieldCheck, TriangleAlert } from "lucide-react"
import { Link } from "react-router-dom"
import { COMMON_GUIDES, MANUAL_FOOTER, PROFILE_GUIDES, PROFILE_LABELS, PROFILE_NOTE } from "./manualData"
import { ManualGuide } from "./ManualGuide"
import { ACCESS_PATH, PROFILE_ICONS, type ProfileKey } from "./manualProfile"

function Icon({ k, size }: { k: ProfileKey; size: number }) {
  const C = PROFILE_ICONS[k]
  return <C className="ic" size={size} strokeWidth={1.75} aria-hidden="true" />
}

/** Franja de perfil detectado: chip icono + palabra, propósito y cómo se calcula. */
function ProfileStrip({ k }: { k: ProfileKey }) {
  const p = PROFILE_GUIDES[k]
  return (
    <section className="strip" aria-label="Perfil detectado">
      <span className="pchip"><Icon k={k} size={18} /><span>{PROFILE_LABELS[k]}</span></span>
      <div className="st">
        <b>{p.name}</b>
        <span className="pu">{p.purpose}</span>
        <span className="nt">{`Estás viendo el manual de ${PROFILE_LABELS[k]} · ${PROFILE_NOTE}`}</span>
      </div>
    </section>
  )
}

function Highlights({ k }: { k: ProfileKey }) {
  const p = PROFILE_GUIDES[k]
  return (
    <div className="two">
      <section className="card hl ok">
        <h2><CircleCheck className="ic" size={20} strokeWidth={1.75} aria-hidden="true" /><span>Lo que puedes hacer</span></h2>
        <ul className="bl">{p.allowed.map(t => <li key={t}>{t}</li>)}</ul>
      </section>
      <section className="card hl no">
        <h2><TriangleAlert className="ic" size={20} strokeWidth={1.75} aria-hidden="true" /><span>Límites de tu perfil</span></h2>
        <ul className="bl">{p.forbidden.map(t => <li key={t}>{t}</li>)}</ul>
      </section>
    </div>
  )
}

/** Manual completo del perfil: franja, puedes/límites, guías comunes + del perfil y pie con enlace real. */
export function ManualScreen({ k }: { k: ProfileKey }) {
  const all = [...COMMON_GUIDES, ...PROFILE_GUIDES[k].workflow]
  const odd = all.length % 2 === 1
  return (
    <>
      <div className="ph">
        <h1>Manual de mi perfil</h1>
        <Link className="btn pri" to={ACCESS_PATH}>
          <ShieldCheck className="ic" size={18} strokeWidth={1.75} aria-hidden="true" /><span>Solicitar acceso</span>
        </Link>
      </div>
      <ProfileStrip k={k} />
      <Highlights k={k} />
      <div className="guides">{all.map((g, i) => <ManualGuide key={g.title} guide={g} wide={odd && i === all.length - 1} />)}</div>
      <footer className="foot">
        <p>{MANUAL_FOOTER}</p>
        <Link to={ACCESS_PATH}>
          <ChevronRight className="ic" size={16} strokeWidth={1.75} aria-hidden="true" /><span>Solicitudes de acceso</span>
        </Link>
      </footer>
    </>
  )
}
