import { Route, Router } from "wouter";
import type { ComponentType } from "react";
import Login from "./pages/Login";
import Usuarios from "./pages/Usuarios";
import Ventas from "./pages/Ventas";
import Cocina from "./pages/Cocina";
import Despacho from "./pages/Despacho";
import Compras from "./pages/Compras";
import Notificaciones from "./pages/Notificaciones";
import { RutaProtegida } from "./components/RutaProtegida";
import { ROLES_POR_RUTA } from "./config/roles";

const conRuta = (ruta: string, Pagina: ComponentType) => () => (
  <RutaProtegida ruta={ruta} roles={ROLES_POR_RUTA[ruta]}>
    <Pagina />
  </RutaProtegida>
);

export const App = () => {
  return (
    <Router>
      <Route path="/copac/login" component={Login} />
      <Route path="/copac/usuarios" component={Usuarios} />
      <Route path="/copac/ventas" component={conRuta("/copac/ventas", Ventas)} />
      <Route path="/copac/cocina" component={conRuta("/copac/cocina", Cocina)} />
      <Route path="/copac/despacho" component={conRuta("/copac/despacho", Despacho)} />
      <Route path="/copac/compras" component={conRuta("/copac/compras", Compras)} />
      <Route path="/copac/notificaciones" component={conRuta("/copac/notificaciones", Notificaciones)} />
    </Router>
  )
}