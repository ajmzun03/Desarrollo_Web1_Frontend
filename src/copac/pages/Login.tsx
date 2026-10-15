import { AsideInformation } from "../components/AsideInformation";
import { Form } from "../components/Form";
import '../styles/login.css'

export default function Login() {
  return (
    <div className="login__copac">
      <AsideInformation />
      <section className='login__container'>
        <h2>Iniciar sesión</h2>
        <p>Ingresa tus credenciales para continuar</p>
        <Form/>
        <p className="login__footer">COPAC v2.4 · © 2024 Sistema Empresarial · Todos los derechos reservados</p>
      </section>
    </div>
  )
}