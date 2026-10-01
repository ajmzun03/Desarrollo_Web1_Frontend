import { Route, Router } from "wouter";
import Login from "./pages/Login";
import Usuarios from "./pages/Usuarios";

export const App = () => {
  return (
    <Router>
      <Route path="/copac/login" component={Login} />
      <Route path="/copac/usuarios" component={Usuarios} />
    </Router>
  )
}