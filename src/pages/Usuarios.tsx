import { useEffect, useState } from "react";
import { usuariosService } from "../services/usuarios.service";
import { ROL_LABEL } from "../config/navegacion";
import type { Usuario } from "../types";
import "../styles/ui.css";
import "../styles/usuarios.css";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="usuarios">
      <header className="usuarios__cabecera">
        <h2 className="usuarios__titulo">Usuarios del sistema</h2>
        <p className="usuarios__sub">{cargando ? "Cargando usuarios…" : `${usuarios.length} usuarios registrados`}</p>
      </header>

      {error && <div className="ui-error">{error}</div>}

      {!error && !cargando && (
        <div className="ui-panel">
          <table className="ui-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Correo electrónico</th>
                <th>Rol</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
