export interface DatosTarjeta {
  number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
}

export interface FormularioTarjeta {
  numero: string;
  titular: string;
  vence: string;
  cvc: string;
}

// Agrupa de 4 en 4 mientras se escribe: "4242424242424242" -> "4242 4242 4242 4242".
export const formatearNumero = (valor: string): string =>
  valor.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

// "1228" -> "12/28".
export const formatearVence = (valor: string): string => {
  const d = valor.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

// Algoritmo de Luhn: detecta errores de digitación antes de enviar la tarjeta.
export const luhnValido = (numero: string): boolean => {
  const digitos = numero.replace(/\D/g, "");
  if (digitos.length < 12) return false;
  let suma = 0;
  for (let i = 0; i < digitos.length; i++) {
    let d = Number(digitos[digitos.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
  }
  return suma % 10 === 0;
};

// Devuelve el primer problema encontrado (texto para el cliente) o los datos listos para enviar.
export function validarTarjeta(f: FormularioTarjeta, ahora = new Date()): { error: string } | { datos: DatosTarjeta } {
  const numero = f.numero.replace(/\D/g, "");
  if (!luhnValido(numero)) return { error: "El número de tarjeta no es válido." };
  if (f.titular.trim().length < 3) return { error: "Ingresa el nombre que aparece en la tarjeta." };
  const m = /^(\d{2})\/(\d{2})$/.exec(f.vence);
  if (!m) return { error: "Ingresa el vencimiento como MM/AA." };
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return { error: "El mes de vencimiento no es válido." };
  if (anio < ahora.getFullYear() || (anio === ahora.getFullYear() && mes < ahora.getMonth() + 1)) {
    return { error: "La tarjeta está vencida." };
  }
  if (!/^\d{3,4}$/.test(f.cvc)) return { error: "El código de seguridad debe tener 3 o 4 dígitos." };
  return { datos: { number: numero, exp_month: mes, exp_year: anio, cvc: f.cvc } };
}
