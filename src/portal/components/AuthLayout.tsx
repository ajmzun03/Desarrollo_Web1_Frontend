import type { ReactNode } from "react";
import { Link } from "wouter";
import "../styles/portal.css";

interface Props {
  titulo: ReactNode;
  texto: string;
  rojo?: boolean;
  children: ReactNode;
}

// Pantalla dividida de login/registro: branding a la izquierda, formulario a la derecha.
export const AuthLayout = ({ titulo, texto, rojo, children }: Props) => (
  <div className="portal p-auth">
    <section className={rojo ? "p-auth__marca p-auth__marca--rojo" : "p-auth__marca"}>
      <Link href="/" className="p-logo"><span className="p-logo__marca">C</span> COPAC</Link>
      <h1>{titulo}</h1>
      <p>{texto}</p>
    </section>
    <section className="p-auth__form">{children}</section>
  </div>
);
