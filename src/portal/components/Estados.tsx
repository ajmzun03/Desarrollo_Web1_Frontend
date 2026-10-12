export const Cargando = ({ texto = "Cargando…" }: { texto?: string }) => (
  <p className="p-estado" role="status">
    {texto}
  </p>
);

export const ErrorMsg = ({ mensaje }: { mensaje: string }) => (
  <p className="p-estado p-estado--error" role="alert">
    {mensaje}
  </p>
);

export const Vacio = ({ titulo, texto, children }: { titulo: string; texto?: string; children?: React.ReactNode }) => (
  <div className="p-vacio">
    <h2>{titulo}</h2>
    {texto && <p>{texto}</p>}
    {children}
  </div>
);
