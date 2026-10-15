import { COPACLogo } from "./COPACLogo"
import { ROLES } from "../types"

const MODULOS = ["Ventas", "Cocina", "Despacho", "Compras", "Reportes", "Auditoría"];

export const AsideInformation = () => {
  return (
    <aside className="login__aside">
      <COPACLogo />

      <div className="login__aside-texto">
        <h1>
          Control, Producción y Abastecimiento <span>para Cocinas.</span>
        </h1>
        <p>Gestión integral de operaciones gastronómicas — inventario, producción, pedidos y logística en un solo lugar.</p>
      </div>

      <ul className="login__stats">
        <li>
          <strong>{MODULOS.length}</strong>
          <span>Módulos</span>
        </li>
        <li>
          <strong>{ROLES.length}</strong>
          <span>Roles</span>
        </li>
        <li>
          <strong>V1.0</strong>
          <span>Versión</span>
        </li>
      </ul>

      <footer>
        <ul className="login__modulos">
          {MODULOS.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </footer>
    </aside>
  )
}
