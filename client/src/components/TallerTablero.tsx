// Tablero de /taller: tres columnas por estado en pantallas anchas (lg+) y, en
// tablet vertical o celular, pestañas con contadores que muestran una columna.
import { useState } from "react";
import { NOMBRE_AREA, NOMBRE_ESTADO } from "../dominio";
import { propsEntrada, useEntradaInicial } from "./useEntradaInicial";
import type { EstadoServicio, TipoServicio } from "../types";
import { TallerTrabajo } from "./TallerTrabajo";
import {
  ESTADOS_TABLERO,
  pestanaInicial,
  type Tablero,
  type Toque,
  type Trabajo,
} from "./tallerTablero";

interface Props {
  tablero: Tablero;
  area: TipoServicio;
  toque: Toque | null;
  ocupado: boolean;
  onCambiar: (trabajo: Trabajo, estado: EstadoServicio) => void;
}

const TEXTO_VACIO: Record<EstadoServicio, string> = {
  esperando: "No hay trabajos esperando",
  en_proceso: "Nada en proceso",
  terminado: "Todavía no hay trabajos terminados",
};

export function TallerTablero({
  tablero,
  area,
  toque,
  ocupado,
  onCambiar,
}: Props) {
  // Pestaña elegida a mano (solo se usa en pantallas angostas). Mientras no se
  // elija ninguna, se muestra la que corresponde según los datos.
  const [elegida, setElegida] = useState<EstadoServicio | null>(null);
  const activa = elegida ?? pestanaInicial(tablero);
  const entrada = useEntradaInicial();
  const total = ESTADOS_TABLERO.reduce((n, e) => n + tablero[e].length, 0);

  if (total === 0) {
    return (
      <p className="rounded-sm border border-con-borde bg-con-sup p-10 text-center text-xl text-con-suave">
        No hay trabajos de {NOMBRE_AREA[area]}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Estado de los trabajos"
        className="grid grid-cols-3 gap-1 rounded-sm border border-con-borde bg-con-sup p-1 lg:hidden"
      >
        {ESTADOS_TABLERO.map((e) => {
          const on = e === activa;
          return (
            <button
              key={e}
              type="button"
              aria-pressed={on}
              onClick={() => setElegida(e)}
              className={`con-foco flex min-h-14 flex-col items-center justify-center rounded-sm px-1 transition-colors ${
                on
                  ? "bg-con-acento text-white"
                  : "text-con-suave hover:bg-con-sup2 hover:text-con-texto"
              }`}
            >
              <span className="text-[15px] leading-tight font-medium sm:text-base">
                {NOMBRE_ESTADO[e]}
              </span>
              <span className="text-lg leading-tight font-light tabular-nums">
                {tablero[e].length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {ESTADOS_TABLERO.map((e) => (
          <section
            key={e}
            aria-label={NOMBRE_ESTADO[e]}
            className={`min-w-0 flex-col gap-3 lg:flex ${
              e === activa ? "flex" : "hidden"
            }`}
          >
            <h2 className="hidden items-baseline justify-between border-b border-con-borde-fuerte pb-2 lg:flex">
              <span className="font-mono text-xs font-medium tracking-[0.12em] text-con-suave uppercase">
                {NOMBRE_ESTADO[e]}
              </span>
              <span className="text-2xl leading-none font-light text-con-texto tabular-nums">
                {tablero[e].length}
              </span>
            </h2>
            {tablero[e].length === 0 ? (
              <p className="rounded-sm border border-dashed border-con-borde-fuerte p-8 text-center text-lg text-con-suave">
                {TEXTO_VACIO[e]}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {tablero[e].map((t, i) => (
                  <TallerTrabajo
                    key={t.servicio.id}
                    trabajo={t}
                    entrada={propsEntrada(entrada, i)}
                    destello={
                      toque?.servicioId === t.servicio.id ? toque.clave : 0
                    }
                    ocupado={ocupado}
                    onCambiar={onCambiar}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
