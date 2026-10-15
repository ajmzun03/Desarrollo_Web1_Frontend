import { Link } from "wouter";
import { MapPin } from "lucide-react";
import { PortalLayout } from "../components/PortalLayout";
import { Cargando, ErrorMsg } from "../components/Estados";
import { useDatos } from "../../hooks/useDatos";
import { sucursalesService } from "../../copac/services/sucursales.service";
import { municipiosService } from "../../copac/services/municipios.service";

// La API V1 de sucursales solo trae nombre, direccion y municipio: no hay horarios,
// telefono ni estado abierto/cerrado, asi que esta vista no los muestra.
export default function Sucursales() {
  const { datos, cargando, error } = useDatos(async () => {
    const [sucursales, municipios] = await Promise.all([sucursalesService.getAll(), municipiosService.getAll()]);
    return sucursales.map((s) => ({ ...s, municipio: municipios.find((m) => m.id === s.municipio_id)?.municipio ?? "" }));
  });

  return (
    <PortalLayout>
      <div className="p-contenedor">
        <header className="p-pagina-cab">
          <span className="p-sobretitulo">COPAC</span>
          <h1 className="p-titulo">Nuestras sucursales</h1>
          <p className="p-sub">{datos ? `${datos.length} sucursales` : "Cargando sucursales…"}</p>
        </header>
        {cargando && <Cargando />}
        {error && <ErrorMsg mensaje={error} />}
        <div className="p-grid p-grid--sucursales">
          {datos?.map((s) => (
            <article key={s.id} className="p-panel p-sucursal">
              <h2>{s.sucursal}</h2>
              <p><MapPin size={14} aria-hidden="true" /> {s.direccion ?? "Dirección no disponible"}</p>
              {s.municipio && <p className="p-sub">{s.municipio}</p>}
              <Link href="/menu" className="p-enlace">Ordenar aquí →</Link>
            </article>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
