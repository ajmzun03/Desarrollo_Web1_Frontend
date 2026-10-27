import { Flame } from "lucide-react"
import "../styles/COPACLogo.css"

export const COPACLogo = () => {
  return (
    <div className="copac-logo">
      <figure className="copac-logo__image">
        <Flame size={22} aria-hidden="true" />
      </figure>
      <span className="copac-logo__text">
        <p className="copac-logo__title">COPAC</p>
        <p className="copac-logo__subtitle">Sistema empresarial</p>
      </span>
    </div>
  )
}