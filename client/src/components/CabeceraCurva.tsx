// La parte oscura con la curva amplia hacia el fondo crema: es lo que le da la
// misma cara a /display, /admin y /taller. Adentro van siempre el logo ML
// (arriba a la izquierda) y, según la vista, la referencia de conos y/o los
// botones de la vista (arriba a la derecha).
//
//   alto="hero"     → casi toda la pantalla, para la bienvenida del showroom.
//   alto="compacta" → una barra superior, para las vistas con lista.
//
// La curva la dibuja la clase .curva (index.css, con media queries); el
// resplandor dorado del borde es una sombra interior que sigue esa misma curva.
import type { ReactNode } from "react";
import { AREAS, COLOR_AREA, NOMBRE_AREA } from "../dominio";
import { Cono } from "./Cono";
import { LogoML } from "./LogoML";

interface Props {
  alto: "hero" | "compacta";
  // Referencia "cono = área" arriba a la derecha (para las vistas de clientes).
  conos?: boolean;
  // Botones propios de la vista (Inicio, + Nuevo auto, Salir…).
  acciones?: ReactNode;
  // Contenido centrado del hero (título, subtítulo, flecha).
  children?: ReactNode;
}

export function CabeceraCurva({ alto, conos, acciones, children }: Props) {
  const hero = alto === "hero";

  return (
    <div
      className={`relative overflow-hidden bg-tinta text-white ${
        hero
          ? "curva flex min-h-[86dvh] flex-col px-4 pt-4 pb-16 sm:px-8 sm:pt-6 sm:pb-24"
          : "curva-baja px-4 pt-4 pb-12 sm:px-8 sm:pt-5 sm:pb-16 xl:pb-20"
      }`}
      style={{
        boxShadow:
          "inset 0 -42px 28px -32px rgba(238, 172, 28, 0.85), 0 8px 28px -14px rgba(242, 194, 48, 0.2)",
      }}
    >
      {/* Fila de arriba: logo a la izquierda, referencia y botones a la derecha.
          En el celular bajan de fila en vez de apretarse. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <LogoML className="h-10 w-auto shrink-0 sm:h-14 xl:h-16" />

        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          {conos && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-6">
              {AREAS.map((tipo) => (
                <div key={tipo} className="flex items-center gap-2">
                  <Cono
                    color={COLOR_AREA[tipo]}
                    estado="esperando"
                    className="h-6 w-6 shrink-0 sm:h-8 sm:w-8 xl:h-9 xl:w-9"
                  />
                  <span className="text-base sm:text-xl xl:text-2xl">
                    {NOMBRE_AREA[tipo]}
                  </span>
                </div>
              ))}
            </div>
          )}
          {acciones}
        </div>
      </div>

      {hero && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center sm:gap-6">
          {children}
        </div>
      )}
    </div>
  );
}
