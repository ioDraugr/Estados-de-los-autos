// Cola de anuncios "listo para retirar" de la bienvenida del showroom.
//
// Display le pasa cada lista que llega (registrar) y acá se compara con la
// anterior: un auto que ya estaba y NO estaba listo, y ahora sí, se anuncia.
// - La primera carga nunca anuncia (no hay con qué comparar): si la pantalla se
//   reinicia justo cuando un auto queda listo, ese anuncio se pierde (aceptado).
// - Un auto que aparece ya listo (recién dado de alta así, o que vuelve a la
//   lista) tampoco: no hubo un "pasó a listo" que festejar.
// - Se muestra uno a la vez durante MS_ANUNCIO, y después el siguiente. Si un
//   auto de la cola deja de estar listo o desaparece antes de su turno (o
//   mientras se muestra), se saca. Un auto que ya está en la cola no se repite.
// - Mientras se ve la lista de autos (activo = false) no se encola nada, y al
//   salir de la bienvenida se descarta la cola: el anuncio es solo para el
//   cartel, y al volver no conviene mostrar avisos viejos a medias.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Vehiculo } from "./types";
import { autoTerminado } from "./dominio";

// Cuánto dura cada anuncio en pantalla. Lo maneja un timer (no el fin de la
// animación de la barrita): con "reducir movimiento" la animación no corre y
// el anuncio igual tiene que durar lo mismo.
export const MS_ANUNCIO = 10_000;

export function useAnunciosListo(activo: boolean) {
  // Autos en cola; el primero es el que se está mostrando. Se guardan los datos
  // frescos de cada uno (si editan la marca mientras espera, sale corregida).
  const [cola, setCola] = useState<Vehiculo[]>([]);
  // Foto de la lista anterior: id → si estaba listo. null hasta la primera
  // carga. En un ref y no en estado: solo sirve para comparar, no se dibuja.
  const anterior = useRef<Map<number, boolean> | null>(null);
  // Si se está viendo la bienvenida; en un ref para leerlo desde registrar sin
  // que cambie la función (Display la usa dentro de su efecto de carga).
  const activoRef = useRef(activo);

  useEffect(() => {
    activoRef.current = activo;
  }, [activo]);

  const registrar = useCallback((vehiculos: Vehiculo[]) => {
    const antes = anterior.current;
    anterior.current = new Map(vehiculos.map((v) => [v.id, autoTerminado(v)]));

    const nuevos =
      antes && activoRef.current
        ? vehiculos.filter((v) => antes.get(v.id) === false && autoTerminado(v))
        : [];

    setCola((cola) => {
      // Los que siguen listos, con sus datos al día; los demás se caen.
      const vigentes = cola.flatMap((enCola) => {
        const v = vehiculos.find((x) => x.id === enCola.id);
        return v && autoTerminado(v) ? [v] : [];
      });
      const sinRepetir = nuevos.filter(
        (v) => !vigentes.some((x) => x.id === v.id),
      );
      // Nada cambió: misma cola, así no se re-dibuja en cada poll.
      if (
        sinRepetir.length === 0 &&
        vigentes.length === cola.length &&
        vigentes.every((v, i) => v === cola[i])
      ) {
        return cola;
      }
      return [...vigentes, ...sinRepetir];
    });
  }, []);

  // Vacía la cola (al pasar de la bienvenida a la lista).
  const descartar = useCallback(() => setCola([]), []);

  // El reloj del anuncio que se está mostrando. Depende solo del id: si llega
  // una lista nueva con el mismo auto adelante, no vuelve a arrancar.
  const actualId = cola[0]?.id;
  useEffect(() => {
    if (actualId === undefined) return;
    const timer = setTimeout(() => {
      setCola((cola) => (cola[0]?.id === actualId ? cola.slice(1) : cola));
    }, MS_ANUNCIO);
    return () => clearTimeout(timer);
  }, [actualId]);

  return { anuncio: cola[0] ?? null, registrar, descartar };
}
