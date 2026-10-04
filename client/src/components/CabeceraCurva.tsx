// La parte oscura con la curva dorada: es lo que le da la misma cara a
// /display, /admin y /taller. Arriba va siempre una barra cápsula de vidrio
// oscuro con el logo ML (a la izquierda) y, según la vista, la referencia de
// conos y/o los botones de la vista (a la derecha).
//
//   alto="hero"     → toda la pantalla, para la bienvenida del showroom. El
//                     filo dorado es un HORIZONTE abajo: un arco convexo enorme
//                     que asoma desde el borde inferior.
//   alto="compacta" → una cúpula oscura arriba, para las vistas con lista. La
//                     parte oscura termina abajo en un arco ancho con filo
//                     dorado y resplandor que cae sobre el fondo de la página.
//
// Los dos arcos (radios, filo y resplandor) están en index.css
// (.cabecera-cupula y .cabecera-horizonte), porque necesitan media queries.
//
// Las vistas del personal (/taller y /admin) usan tono="claro": sin parte
// oscura ni curva, solo una barra sobria de superficie sólida con borde
// inferior fino (texto en tinta, sin cápsula flotante ni sombras).
// /display usa el tono "oscuro" (por defecto), que es lo de arriba.
import type { ReactNode } from "react";
import { AREAS, COLOR_AREA, COLOR_AREA_OSCURO, NOMBRE_AREA } from "../dominio";
import { Cono } from "./Cono";
import { LogoML } from "./LogoML";

interface Props {
  alto: "hero" | "compacta";
  // Referencia "cono = área" arriba a la derecha (para las vistas de clientes).
  conos?: boolean;
  // Botones propios de la vista (Inicio, + Nuevo auto, Salir…).
  acciones?: ReactNode;
  // Contenido centrado del hero (emblema, título, subtítulo, frase).
  children?: ReactNode;
  // Solo en el hero: lo que va abajo, centrado y apoyado sobre el horizonte
  // dorado (la cápsula con el taller en vivo de la bienvenida).
  pie?: ReactNode;
  // "oscuro" (por defecto) = cúpula/horizonte oscuro del showroom.
  // "claro" = solo la barra de vidrio claro (vistas del personal, compacta).
  tono?: "oscuro" | "claro";
}

export function CabeceraCurva({
  alto,
  conos,
  acciones,
  children,
  pie,
  tono = "oscuro",
}: Props) {
  const hero = alto === "hero";
  const claro = tono === "claro";

  // Barra cápsula de vidrio oscuro. En el celular no entra todo en una fila:
  // el logo y los botones quedan arriba y la referencia de conos baja a una
  // segunda fila (por eso deja de ser una cápsula perfecta y pasa a esquinas
  // redondeadas). De tablet para arriba, todo en una sola fila.
  const barra = (
    <div
      className={`relative z-10 flex flex-wrap items-center gap-x-4 gap-y-2 ${
        claro
          ? "px-3 py-2 text-tinta sm:gap-x-6 sm:px-6 xl:px-10"
          : "rounded-[28px] py-2 pr-2 pl-4 sm:gap-x-6 sm:rounded-full sm:pl-5 vidrio-oscuro"
      }`}
    >
      <LogoML className="h-9 w-auto shrink-0 sm:h-10 xl:h-12" />

      {conos && (
        <div className="order-last flex w-full flex-wrap justify-center gap-x-4 gap-y-1 pb-1 sm:order-none sm:ml-auto sm:w-auto sm:justify-end sm:gap-x-6 sm:pb-0 xl:gap-x-8">
          {AREAS.map((tipo) => (
            <div key={tipo} className="flex items-center gap-2 sm:gap-2.5">
              <Cono
                color={claro ? COLOR_AREA[tipo] : COLOR_AREA_OSCURO[tipo]}
                estado="esperando"
                className="h-5 w-auto shrink-0 sm:h-6 xl:h-7"
              />
              <span className="text-sm font-medium sm:text-lg xl:text-xl">
                {NOMBRE_AREA[tipo]}
              </span>
            </div>
          ))}
        </div>
      )}

      {acciones && (
        <div
          className={`ml-auto flex items-center gap-2 sm:gap-3 ${
            conos ? "sm:ml-0" : ""
          }`}
        >
          {acciones}
        </div>
      )}
    </div>
  );

  if (hero) {
    return (
      <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-tinta px-3 pt-3 text-crema cabecera-cielo sm:px-8 sm:pt-6 bajo:pt-3">
        {/* El horizonte dorado: decorativo, detrás de todo el contenido. */}
        <div aria-hidden="true" className="cabecera-horizonte" />

        {barra}

        {/* En pantallas bajas (celular acostado) casi sin aire abajo, para
            que el emblema y los textos entren sin scroll ni pisen el
            horizonte. Con pie, el aire de abajo lo pone el pie (que va en el
            flujo, debajo de los textos: así nunca se pisan aunque la
            pantalla sea baja). */}
        <div
          className={`relative z-10 flex flex-1 flex-col items-center justify-center pt-4 text-center bajo:pt-0 ${
            pie ? "pb-6 bajo:pb-2" : "pb-[16dvh] bajo:pb-[7dvh]"
          }`}
        >
          {children}
        </div>

        {/* El pie queda apoyado justo sobre el filo del horizonte: el
            horizonte arranca al 77 % del alto (92 % en pantallas bajas, ver
            .cabecera-horizonte en index.css), así que abajo se deja un poco
            más que ese resto. */}
        {pie && (
          <div className="relative z-10 flex justify-center">{pie}</div>
        )}

        {/* El aire de abajo del pie es un separador que cede: se lleva primero
            el espacio libre (grow enorme) hasta 24dvh, y si no sobra se achica
            hasta casi nada. Con un padding fijo, en pantallas medianas
            (1280×720) o con un pie más alto (el anuncio de "listo") la página
            crecía y aparecía scroll; así el pie baja un poco sobre el
            horizonte en vez de agrandar la pantalla. */}
        {pie && (
          <div
            aria-hidden="true"
            className="min-h-2 shrink-0 grow-[1000] basis-0 max-h-[24dvh] bajo:max-h-[9dvh]"
          />
        )}
      </div>
    );
  }

  // Claro: barra a todo el ancho, superficie sólida y borde inferior fino. El
  // aire hasta el título lo pone la página.
  if (claro) {
    return (
      <div className="border-b border-linea bg-crema-alta">{barra}</div>
    );
  }

  // Compacta: la cúpula oscura va detrás de la barra y termina un poco antes
  // del borde de abajo, para que su resplandor dorado tenga lugar donde
  // apagarse (el contenedor recorta lo que sobra y no pisa el contenido de la
  // página). El espacio de abajo es transparente: se ve el fondo de la vista.
  return (
    <div className="relative overflow-hidden px-3 pt-3 pb-14 text-crema sm:px-8 sm:pt-6 sm:pb-20 xl:pb-26">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 bottom-8 cabecera-cupula sm:bottom-10 xl:bottom-12"
      />
      {barra}
    </div>
  );
}
