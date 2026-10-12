import { useEffect, useState } from "react";

export interface Estado<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
}

// Carga asincrona simple con estado de carga y error. Se vuelve a ejecutar
// cuando cambia `clave` (por ejemplo el id de la ruta).
export function useDatos<T>(cargar: () => Promise<T>, clave: string | number | null = ""): Estado<T> {
  const [estado, setEstado] = useState<Estado<T>>({ datos: null, cargando: true, error: null });

  useEffect(() => {
    let vigente = true;
    cargar()
      .then((datos) => vigente && setEstado({ datos, cargando: false, error: null }))
      .catch((e: unknown) =>
        vigente && setEstado({ datos: null, cargando: false, error: e instanceof Error ? e.message : "Error inesperado" }),
      );
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  return estado;
}
