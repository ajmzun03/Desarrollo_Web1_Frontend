import { Flame } from "lucide-react"

export const COPACLogo = () => {
  return (
    <div className="copac-logo">
      <figure className="copac-logo__image">
        <Flame />
      </figure>
      <span className="copac-logo__text">
        <p className="copac-logo__title">COPAC</p>
        <p className="copac-logo__subtitle">Sistema empresarial</p>
      </span>
    </div>
  )
}