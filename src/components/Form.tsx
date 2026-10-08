import { setCookie } from "../utils/cookies";
import type { FormEvent } from "react";
import { Checkbox } from "./Checkbox";
import { DataList } from "./DataList";
import { Input } from "./Input";

const roles = ['Administrador', 'Cajero', 'Mesero', 'Cocinero'];

const API_URL = 'https://desarrollo-web1-backend.onrender.com';

export const Form = () => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario: formData.get('usuario'),
        contrasenia: formData.get('contrasenia')
      })
    })
      .then(res => res.json())
            .then(data => {
        if (data.error) {
          console.error('Credenciales inválidas', data.error);
          return;
        }

        const recordar = formData.get('remember') === 'on';
        const UN_DIA = 60 * 60 * 24; // el token dura 24 h

        // Con "Recordar sesión" la cookie dura 1 día; sin ella, se borra al cerrar el navegador
        setCookie('token', data.data.token, recordar ? UN_DIA : undefined);
        setCookie('usuario', JSON.stringify(data.data.usuario), recordar ? UN_DIA : undefined);

        console.log('Sesión guardada', data.data.usuario);
      })

      .catch(error => console.error(error));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Usuario"
        name="usuario"
        type="text"
        placeholder="Ingresa tu usuario"
      />
      <Input
        label="Contraseña"
        name="contrasenia"
        type="password"
        placeholder="Ingresa tu contraseña"
      />

      <DataList data={roles} />

      <div className="form__remember">
        <Checkbox
          label="Recordar sesión"
          name="remember" />
        <a href="#reset-password">¿Olvidaste tu contraseña?</a>
      </div>

      <button type="submit">Ingresar al sistema</button>
    </form>
  );
};