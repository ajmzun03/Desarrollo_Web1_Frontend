import { useEffect, useState } from "react";
import { usuariosService } from "../services/usuarios.service";
import { authService } from "../services/auth.service";
import { ROL_LABEL } from "../config/roles";
import type { Usuario } from "../types";
import "../styles/ui.css";
import "../styles/usuarios.css";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [reiniciando, setReiniciando] = useState<number | null>(null);

  useEffect(() => {
    let vigente = true;
    usuariosService
      .getAll()
      .then((data) => vigente && setUsuarios(data))
      .catch((e: unknown) => vigente && setError(e instanceof Error ? e.message : "No se pudo cargar la lista de usuarios."))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, []);

  // Para quien perdio su telefono: elimina su autenticador y cierra sus sesiones. En su proximo
  // inicio de sesion escaneara un QR nuevo. Supabase no ofrece codigos de respaldo: esta es la via de recuperacion.
  const reiniciarAutenticador = async (u: Usuario) => {
    const nombre = u.usuario ?? u.correo_electronico ?? `usuario ${u.id}`;
    if (!window.confirm(`¿Reiniciar el autenticador de ${nombre}? Se cerrarán sus sesiones y deberá configurarlo de nuevo.`)) return;
    setReiniciando(u.id);
    setAviso(null);
    setError(null);
    try {
      await authService.reiniciarMfa(u.id);
      setAviso(`Autenticador de ${nombre} reiniciado. Escaneará un QR nuevo en su próximo inicio de sesión.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reiniciar el autenticador.");
    } finally {
      setReiniciando(null);
    }
  };

  return (
    <section className="usuarios">
      <header className="usuarios__cabecera">
        <h2 className="usuarios__titulo">Usuarios del sistema</h2>
        <p className="usuarios__sub">{cargando ? "Cargando usuarios…" : `${usuarios.length} usuarios registrados`}</p>
      </header>

      {error && <div className="ui-error" role="alert">{error}</div>}
      {aviso && <div className="usuarios__aviso" role="status">{aviso}</div>}

      {!cargando && usuarios.length > 0 && (
        <div className="ui-panel">
          <table className="ui-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Correo electrónico</th>
                <th>Rol</th>
                <th>Autenticador</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.usuario ?? "—"}</td>
                  <td>{u.correo_electronico ?? "—"}</td>
                  <td>
                    <span className="usuarios__rol">{ROL_LABEL[u.rol]}</span>
                  </td>
                  <td>
                    <button type="button" className="ui-btn ui-btn--ghost" disabled={reiniciando === u.id} onClick={() => reiniciarAutenticador(u)}>
                      {reiniciando === u.id ? "Reiniciando…" : "Reiniciar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
