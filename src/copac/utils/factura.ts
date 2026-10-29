import type { FacturaVenta } from "../types";

// Mismas serie y correlativo que las facturas ya emitidas (FV-50001, FV-50002...).
export const SERIE_FACTURA = "FV";
const PRIMER_NUMERO = 50001;

// Siguiente correlativo de la serie: el mayor numero emitido + 1 (50001 si aun no hay ninguno).
export function siguienteNumeroFactura(facturas: Pick<FacturaVenta, "serie" | "numero">[], serie = SERIE_FACTURA): string {
  const mayor = facturas
    .filter((f) => f.serie === serie)
    .reduce((max, f) => Math.max(max, Number.parseInt(f.numero, 10) || 0), PRIMER_NUMERO - 1);
  return String(mayor + 1);
}

export const codigoFactura = (f: Pick<FacturaVenta, "serie" | "numero">) => `${f.serie}-${f.numero}`;
