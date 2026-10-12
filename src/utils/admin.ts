// Utilidades compartidas de las vistas administrativas (Dashboard, Reportes, Auditoria).

export type Periodo = "dia" | "semana" | "mes";

export const fmtQ = (n: number) => `Q ${n.toLocaleString("es-GT", { maximumFractionDigits: 0 })}`;
export const fmtQ2 = (n: number) => `Q ${n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fechaLarga = (d: Date) => {
  const t = d.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const fechaHora = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" })} ${d.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" })}`;
};

export const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });

export const claveDia = (iso: string) => iso.slice(0, 10);
export const claveMes = (iso: string) => iso.slice(0, 7);

export const sumar = <T,>(lista: T[], f: (x: T) => number) => lista.reduce((a, x) => a + f(x), 0);

// Inicio (inclusive) del periodo que termina en `ref`: dia = el mismo dia, semana = ultimos 7 dias, mes = ultimos 30.
export const inicioPeriodo = (ref: Date, periodo: Periodo): Date => {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  if (periodo === "semana") d.setDate(d.getDate() - 6);
  if (periodo === "mes") d.setDate(d.getDate() - 29);
  return d;
};

export const enPeriodo = (iso: string, ref: Date, periodo: Periodo) => {
  const t = new Date(iso).getTime();
  const fin = new Date(ref);
  fin.setHours(23, 59, 59, 999);
  return t >= inicioPeriodo(ref, periodo).getTime() && t <= fin.getTime();
};

// Variacion porcentual actual vs anterior; null si no hay base de comparacion.
export const variacion = (actual: number, anterior: number): number | null =>
  anterior > 0 ? ((actual - anterior) / anterior) * 100 : null;

// Descarga de datos como CSV (con BOM para que Excel respete los acentos).
export const descargarCSV = (nombre: string, filas: (string | number)[][]) => {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob(["﻿" + filas.map((f) => f.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
};
