// Datos de ejemplo para arrancar el tablero sin tener /admin todavía.
// Se cargan UNA sola vez: si la base ya tiene autos, no se toca nada.
import { db } from "./db.js";
import type { EstadoServicio, TipoServicio } from "./tipos.js";

interface VehiculoSemilla {
  marca: string;
  modelo: string;
  color: string;
  matricula: string;
  diasAtras: number; // hace cuántos días entró al taller
  servicios: { tipo: TipoServicio; estado: EstadoServicio }[];
}

// Autos y modelos típicos de un taller en Uruguay, con estados variados
// para que se vean los tres colores de cono y las tarjetas "Listo".
const SEMILLA: VehiculoSemilla[] = [
  {
    marca: "Chevrolet",
    modelo: "Onix",
    color: "Blanco",
    matricula: "SBA 1234",
    diasAtras: 6,
    servicios: [
      { tipo: "instalacion", estado: "en_proceso" },
      { tipo: "polarizado", estado: "esperando" },
    ],
  },
  {
    marca: "Volkswagen",
    modelo: "Gol",
    color: "Gris",
    matricula: "SCD 4589",
    diasAtras: 7,
    servicios: [
      { tipo: "polarizado", estado: "terminado" },
      { tipo: "vitrificado", estado: "en_proceso" },
    ],
  },
  {
    marca: "Fiat",
    modelo: "Cronos",
    color: "Rojo",
    matricula: "SAB 7712",
    diasAtras: 5,
    servicios: [
      { tipo: "instalacion", estado: "esperando" },
      { tipo: "polarizado", estado: "esperando" },
      { tipo: "vitrificado", estado: "esperando" },
    ],
  },
  {
    // Todos los servicios terminados: sale la tarjeta verde "Listo" y, pasadas
    // las horas de HORAS_VISIBLE_TERMINADO, desaparece sola de /display.
    marca: "Suzuki",
    modelo: "Fronx",
    color: "Azul",
    matricula: "SDE 3098",
    diasAtras: 8,
    servicios: [
      { tipo: "instalacion", estado: "terminado" },
      { tipo: "polarizado", estado: "terminado" },
      { tipo: "vitrificado", estado: "terminado" },
    ],
  },
  {
    marca: "Renault",
    modelo: "Kwid",
    color: "Naranja",
    matricula: "SFG 8821",
    diasAtras: 5,
    servicios: [{ tipo: "polarizado", estado: "en_proceso" }],
  },
  {
    marca: "Toyota",
    modelo: "Corolla",
    color: "Negro",
    matricula: "SGH 5567",
    diasAtras: 9,
    servicios: [
      { tipo: "instalacion", estado: "terminado" },
      { tipo: "vitrificado", estado: "en_proceso" },
    ],
  },
  {
    marca: "Peugeot",
    modelo: "208",
    color: "Blanco",
    matricula: "SHI 4402",
    diasAtras: 6,
    servicios: [
      { tipo: "instalacion", estado: "en_proceso" },
      { tipo: "polarizado", estado: "en_proceso" },
      { tipo: "vitrificado", estado: "esperando" },
    ],
  },
  {
    marca: "Nissan",
    modelo: "Frontier",
    color: "Plata",
    matricula: "SIJ 9931",
    diasAtras: 10,
    servicios: [
      { tipo: "instalacion", estado: "terminado" },
      { tipo: "polarizado", estado: "esperando" },
    ],
  },
];

// Fecha de hace N días, en formato YYYY-MM-DD.
function fechaHaceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

export function sembrarSiVacia(): void {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM vehiculos").get() as {
    total: number;
  };

  if (total > 0) {
    console.log(`La base ya tiene datos (${total} vehículos), no se siembra.`);
    return;
  }

  const insertarVehiculo = db.prepare(`
    INSERT INTO vehiculos (marca, modelo, color, matricula, fecha_ingreso)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertarServicio = db.prepare(`
    INSERT INTO servicios (vehiculo_id, tipo, estado)
    VALUES (?, ?, ?)
  `);

  // Todo o nada: si algo falla, no queda media semilla cargada.
  const sembrar = db.transaction((autos: VehiculoSemilla[]) => {
    for (const auto of autos) {
      const { lastInsertRowid } = insertarVehiculo.run(
        auto.marca,
        auto.modelo,
        auto.color,
        auto.matricula,
        fechaHaceDias(auto.diasAtras),
      );
      for (const servicio of auto.servicios) {
        insertarServicio.run(Number(lastInsertRowid), servicio.tipo, servicio.estado);
      }
    }
  });

  console.log("Base vacía: cargando datos de ejemplo…");
  sembrar(SEMILLA);
  console.log(`Datos de ejemplo cargados: ${SEMILLA.length} vehículos.`);
}
