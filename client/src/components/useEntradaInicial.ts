// Verdadero solo un instante después de montar el componente: sirve para animar
// la entrada de las tarjetas en la primera carga y NO en cada refresco por
// socket (las tarjetas que aparecen después no vuelven a animarse).
import { useEffect, useState } from "react";

export function useEntradaInicial(ms = 800): boolean {
  const [entrada, setEntrada] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setEntrada(false), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return entrada;
}

// Demora escalonada (máx. 8 elementos, 40 ms entre uno y otro) o nada.
export function propsEntrada(entrada: boolean, indice: number) {
  return entrada && indice < 8
    ? {
        className: "con-anim-item",
        style: { animationDelay: `${indice * 40}ms` },
      }
    : { className: "", style: undefined };
}
