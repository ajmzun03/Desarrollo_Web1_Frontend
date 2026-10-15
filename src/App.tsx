import { Route, Router } from "wouter";
import type { ComponentType } from "react";
import Login from "./copac/pages/Login";
import Usuarios from "./copac/pages/Usuarios";
import Ventas from "./copac/pages/Ventas";
import Cocina from "./copac/pages/Cocina";
import Despacho from "./copac/pages/Despacho";
import Compras from "./copac/pages/Compras";
import Notificaciones from "./copac/pages/Notificaciones";
import Bodega from "./copac/pages/Bodega";
import RepartidorMovil from "./copac/pages/RepartidorMovil";
import DashboardAdmin from "./copac/pages/DashboardAdmin";
import Reportes from "./copac/pages/Reportes";
import Auditoria from "./copac/pages/Auditoria";
import { RutaProtegida } from "./copac/components/RutaProtegida";
import { ROLES_POR_RUTA } from "./copac/config/roles";
import Home from "./portal/pages/Home";
import Menu from "./portal/pages/Menu";
import ProductoDetalle from "./portal/pages/ProductoDetalle";
import Carrito from "./portal/pages/Carrito";
import Checkout from "./portal/pages/Checkout";
import Confirmacion from "./portal/pages/Confirmacion";
import Seguimiento from "./portal/pages/Seguimiento";
import MisPedidos from "./portal/pages/MisPedidos";
import PedidoDetalle from "./portal/pages/PedidoDetalle";
import Sucursales from "./portal/pages/Sucursales";
import ClienteLogin from "./portal/pages/ClienteLogin";
import Registro from "./portal/pages/Registro";

const conRuta = (ruta: string, Pagina: ComponentType) => () => (
  <RutaProtegida ruta={ruta} roles={ROLES_POR_RUTA[ruta]}>
    <Pagina />
  </RutaProtegida>
);

export const App = () => {
  return (
    <Router>
      {/* Portal del cliente */}
      <Route path="/" component={Home} />
      <Route path="/menu" component={Menu} />
      <Route path="/menu/:id" component={ProductoDetalle} />
      <Route path="/carrito" component={Carrito} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/pedido/:id/confirmacion" component={Confirmacion} />
      <Route path="/pedido/:id/seguimiento" component={Seguimiento} />
      <Route path="/mis-pedidos" component={MisPedidos} />
      <Route path="/mis-pedidos/:id" component={PedidoDetalle} />
      <Route path="/sucursales" component={Sucursales} />
      <Route path="/login" component={ClienteLogin} />
      <Route path="/registro" component={Registro} />

      {/* Sistema interno (personal) */}
      <Route path="/copac/login" component={Login} />
      <Route path="/copac/ventas" component={conRuta("/copac/ventas", Ventas)} />
      <Route path="/copac/cocina" component={conRuta("/copac/cocina", Cocina)} />
      <Route path="/copac/despacho" component={conRuta("/copac/despacho", Despacho)} />
      <Route path="/copac/compras" component={conRuta("/copac/compras", Compras)} />
      <Route path="/copac/notificaciones" component={conRuta("/copac/notificaciones", Notificaciones)} />
      <Route path="/copac/bodega" component={conRuta("/copac/bodega", Bodega)} />
      <Route path="/copac/repartidor" component={conRuta("/copac/repartidor", RepartidorMovil)} />
      <Route path="/copac/dashboard" component={conRuta("/copac/dashboard", DashboardAdmin)} />
      <Route path="/copac/reportes" component={conRuta("/copac/reportes", Reportes)} />
      <Route path="/copac/auditoria" component={conRuta("/copac/auditoria", Auditoria)} />
      <Route path="/copac/usuarios" component={conRuta("/copac/usuarios", Usuarios)} />
    </Router>
  )
}
