// Emblema de la bienvenida del showroom: el rombo ML de vidrio dorado en 3D,
// hecho solo con CSS (sin imágenes ni librerías). Es puramente decorativo.
//
// Cómo está armado (de afuera hacia adentro):
//   - Un halo dorado que late detrás y una sombra dorada debajo que se achica
//     cuando el emblema sube (va sincronizada con la flotación).
//   - Un bloque que flota, con tres ondas en forma de rombo que se expanden y
//     dos destellos que aparecen y giran.
//   - La escena 3D: entra girando, apenas inclinada hacia la cámara. Adentro,
//     dos órbitas acostadas (una punteada y otra dorada con tres puntos en los
//     colores de las áreas, que siempre miran a cámara) y el rombo, que se
//     mece (vaivén) y cada tanto da una vuelta entera en Y (giro). El rombo
//     tiene dos caras (frente y dorso, cada una con su "ML") y 6 capas
//     intermedias que forman el canto, así al girar se ve el espesor.
//
// Todo se dibuja en un escenario fijo de 360×360 px (las medidas de la maqueta)
// y se escala entero con transform: scale() según la pantalla (.emblema en
// index.css). Así el 3D no se deforma: cambia el tamaño, no las proporciones.
// Las animaciones (keyframes emblema-*) también están en index.css y se apagan
// con prefers-reduced-motion: el emblema queda quieto, de frente y bien armado.
import { AREAS, COLOR_AREA_OSCURO } from "../dominio";

// Posición de cada punto sobre la órbita dorada (340×340), uno por área, en
// el mismo orden que AREAS: arriba, abajo a la derecha, abajo a la izquierda.
const POSICION_PUNTO = [
  { left: 164, top: -6 },
  { left: 311, top: 249 },
  { left: 17, top: 249 },
];

// Colores de las capas del canto, de la cara del frente hacia el dorso: más
// oscuras en el medio, como el borde de un vidrio grueso.
const CAPAS = [
  { z: 5, color: "#D9A424" },
  { z: 3, color: "#C9951F" },
  { z: 1, color: "#B8861C" },
  { z: -1, color: "#B8861C" },
  { z: -3, color: "#C9951F" },
  { z: -5, color: "#D9A424" },
];

// Estrella de cuatro puntas de los destellos.
const ESTRELLA = "M12 0 L13.8 10.2 L24 12 L13.8 13.8 L12 24 L10.2 13.8 L0 12 L10.2 10.2 Z";

// Una cara del rombo (frente o dorso): la capa dorada girada 45° y el "ML".
// El frente lleva además el brillo que la cruza cada tanto.
function Cara({ dorso }: { dorso?: boolean }) {
  return (
    <div
      className="emblema-cara"
      style={{
        transform: dorso ? "translateZ(-7px) rotateY(180deg)" : "translateZ(7px)",
      }}
    >
      <div
        className={`emblema-capa emblema-rombo ${dorso ? "" : "emblema-rombo-frente"}`}
        style={{ transform: "rotate(45deg)" }}
      >
        {!dorso && <span className="emblema-brillo" />}
      </div>
      <span className="emblema-letras">ML</span>
    </div>
  );
}

export function EmblemaML() {
  return (
    <div aria-hidden="true" className="emblema">
      <div className="emblema-escenario">
        {/* Halo dorado que late detrás de todo. */}
        <div className="emblema-halo" />

        {/* Sombra dorada en el "piso", sincronizada con la flotación. */}
        <div className="emblema-sombra" />

        <div className="emblema-flotar">
          {/* Ondas: tres rombos que se expanden y se apagan, escalonados. */}
          {[0, 1.2, 2.4].map((demora) => (
            <div
              key={demora}
              className="emblema-onda"
              style={{ animationDelay: `${demora}s` }}
            />
          ))}

          <div className="emblema-entrada">
            {/* Toda la escena apenas inclinada hacia la cámara. */}
            <div
              className="emblema-3d"
              style={{ left: 0, top: 0, width: 360, height: 360, transform: "rotateX(-8deg)" }}
            >
              {/* Órbita punteada, más inclinada, que gira al revés y lento. */}
              <div
                className="emblema-3d"
                style={{ left: 10, top: 10, width: 340, height: 340, transform: "rotateX(74deg) rotateY(22deg)" }}
              >
                <div className="emblema-orbita emblema-orbita-punteada" />
              </div>

              {/* Órbita dorada con un punto por área de trabajo. */}
              <div
                className="emblema-3d"
                style={{ left: 10, top: 10, width: 340, height: 340, transform: "rotateX(74deg)" }}
              >
                <div className="emblema-3d emblema-orbita emblema-orbita-dorada">
                  {AREAS.map((tipo, i) => (
                    <span
                      key={tipo}
                      className="emblema-punto"
                      style={{
                        ...POSICION_PUNTO[i],
                        background: COLOR_AREA_OSCURO[tipo],
                        boxShadow: `0 0 14px 3px ${COLOR_AREA_OSCURO[tipo]}`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* El rombo: se mece y cada tanto gira una vuelta entera. */}
              <div
                className="emblema-3d emblema-vaiven"
                style={{ left: 80, top: 80, width: 200, height: 200 }}
              >
                <div
                  className="emblema-3d emblema-giro"
                  style={{ left: 0, top: 0, width: 200, height: 200 }}
                >
                  <Cara />
                  {CAPAS.map((capa) => (
                    <div
                      key={capa.z}
                      className="emblema-capa"
                      style={{
                        transform: `translateZ(${capa.z}px) rotate(45deg)`,
                        background: capa.color,
                      }}
                    />
                  ))}
                  <Cara dorso />
                </div>
              </div>
            </div>
          </div>

          {/* Dos destellos que aparecen, giran y se apagan (desfasados). */}
          <svg
            viewBox="0 0 24 24"
            className="emblema-destello"
            style={{ left: 238, top: 92, width: 26, height: 26 }}
          >
            <path d={ESTRELLA} fill="#FFF3C8" />
          </svg>
          <svg
            viewBox="0 0 24 24"
            className="emblema-destello"
            style={{ left: 92, top: 212, width: 18, height: 18, animationDelay: "2s" }}
          >
            <path d={ESTRELLA} fill="#FFF3C8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
