import { COPACLogo } from "./COPACLogo"

export const AsideInformation = () => {
  return (
    <aside className="login__aside">
      <COPACLogo />

      <div>
        <h1>Control, Producción y Abasteciemiento para Cocinas.</h1>
        <p>Gestión integral de operaciones gastronómicas — inventario, producción, pedidos y logística en un solo lugar.</p>
      </div>

      <div>
        <ul>
          <li>
            <p>9+</p>
            <span>Módulos</span>
          </li>
          <li>
            <p>9</p>
            <span>Roles</span>
          </li>
          <li>
            <p>V1.0</p>
            <span>Versión</span>
          </li>
        </ul>
      </div>

      <footer>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
          <li>Item 4</li>
          <li>Item 5</li>
          <li>Item 6</li>
          <li>Item 7</li>
          <li>Item 8</li>
          <li>Item 9</li>
        </ul>
      </footer>
    </aside>
  )
}