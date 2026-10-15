// Guarda una cookie. Si das "segundos", sobrevive al cerrar el navegador;
// si no, se borra al cerrarlo (cookie de sesión).
export const setCookie = (nombre: string, valor: string, segundos?: number) => {
  let cookie = `${nombre}=${encodeURIComponent(valor)}; path=/; SameSite=Strict`;
  if (segundos) cookie += `; max-age=${segundos}`;
  document.cookie = cookie;
};

// Lee una cookie por su nombre. Devuelve null si no existe.
export const getCookie = (nombre: string) => {
  const cookie = document.cookie
    .split('; ')
    .find(c => c.startsWith(`${nombre}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
};

// Borra una cookie poniéndole una duración de 0.
export const deleteCookie = (nombre: string) => {
  document.cookie = `${nombre}=; path=/; max-age=0`;
};