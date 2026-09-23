// Consultas y comandos de vehículos para la API.
import { cancelarAvisos, programarIngreso } from "./avisos.js";
import { db } from "./db.js";
import { ErrorValidacion } from "./errores.js";
import { TIPOS_SERVICIO } from "./servicios.js";
import { normalizarTelefono } from "./telefono.js";
import type { Servicio, TipoServicio, Vehiculo } from "./tipos.js";

// Un auto con TODOS sus servicios terminados se sigue mostrando en el showroom
// durante estas horas (para que el cliente lo vea) y después desaparece solo.
export const HORAS_VISIBLE_TERMINADO =
  Number(process.env.HORAS_VISIBLE_TERMINADO) || 4;

type FilaVehiculo = Omit<Vehiculo, "servicios">;
type FilaServicio = Servicio & { actualizado_en: string };

interface DatosVehiculo {
  marca: string;
  modelo: string;
  color: string;
  matricula: string;
  // Celular opcional tal como lo escribió el trabajador; se normaliza al guardar.
  telefono?: unknown;
}

// Datos ya validados, listos para la base (telefono normalizado o null).
interface DatosLimpios {
  marca: string;
  modelo: string;
  color: string;
  matricula: string;
  telefono: string | null;
}

interface OpcionesListado {
  // El celular del cliente es un dato privado: solo sale si quien pide trae un
  // PIN válido (/admin, /taller). Sin esto la clave ni siquiera aparece.
  incluirTelefono?: boolean;
}

// Trae los autos NO retirados que cumplan `condicionExtra` (si se pasa), con sus
// servicios NO eliminados anidados. El que hace más tiempo que entró va primero;
// se desempata por id para que el orden sea estable entre autos del mismo día.
function cargarVehiculos(condicionExtra = ""): {
  vehiculos: FilaVehiculo[];
  porVehiculo: Map<number, FilaServicio[]>;
} {
  const vehiculos = db
    .prepare(
      `SELECT id, marca, modelo, color, matricula, fecha_ingreso, telefono
       FROM vehiculos
       WHERE retirado_en IS NULL ${condicionExtra}
       ORDER BY fecha_ingreso ASC, id ASC`,
    )
    .all() as FilaVehiculo[];

  const servicios = db
    .prepare(
      `SELECT id, vehiculo_id, tipo, estado, actualizado_en
       FROM servicios
       WHERE eliminado_en IS NULL
       ORDER BY id ASC`,
    )
    .all() as FilaServicio[];

  // Agrupamos en JS (dos SELECT simples se leen mejor que un json_group_array).
  const porVehiculo = new Map<number, FilaServicio[]>();
  for (const servicio of servicios) {
    const lista = porVehiculo.get(servicio.vehiculo_id) ?? [];
    lista.push(servicio);
    porVehiculo.set(servicio.vehiculo_id, lista);
  }

  return { vehiculos, porVehiculo };
}

// Arma el Vehiculo que espera el front: sin actualizado_en, que no le sirve, y
// sin el teléfono salvo que se pida explícitamente (ver OpcionesListado).
function anidar(
  v: FilaVehiculo,
  servicios: FilaServicio[],
  { incluirTelefono = false }: OpcionesListado,
): Vehiculo {
  const { telefono, ...datos } = v;
  return {
    ...datos,
    ...(incluirTelefono ? { telefono: telefono ?? null } : {}),
    servicios: servicios.map(
      ({ actualizado_en: _omitido, ...servicio }) => servicio,
    ),
  };
}

/**
 * Vehículos que tiene que mostrar /display: los que están en el taller, más
 * los terminados hace poco. Esconde los retirados y los terminados hace rato.
 */
export function listarVehiculosVisibles(
  opciones: OpcionesListado = {},
): Vehiculo[] {
  const { vehiculos, porVehiculo } = cargarVehiculos();
  const limite = Date.now() - HORAS_VISIBLE_TERMINADO * 60 * 60 * 1000;

  return vehiculos
    .filter((v) => !estaVencido(porVehiculo.get(v.id) ?? [], limite))
    .map((v) => anidar(v, porVehiculo.get(v.id) ?? [], opciones));
}

/**
 * Todos los autos NO retirados (incluidos los terminados hace rato, que /display
 * esconde). Para la lista de /admin (?todos=1).
 */
export function listarTodos(opciones: OpcionesListado = {}): Vehiculo[] {
  const { vehiculos, porVehiculo } = cargarVehiculos();
  return vehiculos.map((v) => anidar(v, porVehiculo.get(v.id) ?? [], opciones));
}

/**
 * Alta de un auto con sus servicios iniciales (todos en "esperando").
 * La fecha de ingreso queda con día + hora para que /display tenga un orden
 * estable entre autos del mismo día. Deja programado el aviso "tu auto entró".
 */
export function crearVehiculo(datos: DatosVehiculo, servicios: TipoServicio[]): number {
  const limpio = validarDatos(datos);
  const tipos = validarServicios(servicios);

  const insertarVehiculo = db.prepare(`
    INSERT INTO vehiculos (marca, modelo, color, matricula, telefono, fecha_ingreso)
    VALUES (@marca, @modelo, @color, @matricula, @telefono, datetime('now'))
  `);
  const insertarServicio = db.prepare(`
    INSERT INTO servicios (vehiculo_id, tipo, estado)
    VALUES (?, ?, 'esperando')
  `);

  // Todo o nada: si algo falla, no queda un auto a medio crear.
  const crear = db.transaction((): number => {
    const { lastInsertRowid } = insertarVehiculo.run(limpio);
    const id = Number(lastInsertRowid);
    for (const tipo of tipos) insertarServicio.run(id, tipo);
    programarIngreso(id);
    return id;
  });

  return crear();
}

/**
 * Edita solo los datos del auto (marca/modelo/color/matrícula/teléfono). NO
 * toca la fecha de ingreso ni los servicios: el auto sigue siendo el mismo.
 * El formulario siempre manda el teléfono: vacío lo borra. Si el campo no viene
 * en el pedido, el teléfono guardado queda como estaba.
 */
export function editarVehiculo(id: number, datos: DatosVehiculo): boolean {
  const limpio = validarDatos(datos);
  const tocaTelefono = datos?.telefono !== undefined;
  const { changes } = db
    .prepare(
      `UPDATE vehiculos
       SET marca = @marca, modelo = @modelo, color = @color, matricula = @matricula
           ${tocaTelefono ? ", telefono = @telefono" : ""}
       WHERE id = @id AND retirado_en IS NULL`,
    )
    .run({ ...limpio, id });
  return changes > 0;
}

// Retirar = soft delete: el auto no se borra, se marca con fecha y desaparece
// de /display y de /admin al instante. Los avisos pendientes se cancelan.
export function retirarVehiculo(id: number): boolean {
  const retirar = db.transaction((): boolean => {
    const { changes } = db
      .prepare(
        "UPDATE vehiculos SET retirado_en = datetime('now') WHERE id = ? AND retirado_en IS NULL",
      )
      .run(id);
    if (changes === 0) return false;
    cancelarAvisos(id);
    return true;
  });
  return retirar();
}

// --- Validaciones ---

function validarDatos(datos: DatosVehiculo): DatosLimpios {
  const limpio = {
    marca: (datos?.marca ?? "").trim(),
    modelo: (datos?.modelo ?? "").trim(),
    color: (datos?.color ?? "").trim(),
    matricula: (datos?.matricula ?? "").trim(),
  };
  if (!limpio.marca || !limpio.modelo || !limpio.color || !limpio.matricula) {
    throw new ErrorValidacion("Faltan datos del auto (marca, modelo, color, matrícula).");
  }
  // El teléfono es opcional: vacío => null; mal escrito => 400 con el motivo.
  return { ...limpio, telefono: normalizarTelefono(datos?.telefono) };
}

function validarServicios(servicios: TipoServicio[]): TipoServicio[] {
  if (!Array.isArray(servicios) || servicios.length === 0) {
    throw new ErrorValidacion("Elegí al menos un servicio.");
  }
  const unicos = [...new Set(servicios)];
  if (unicos.length !== servicios.length) {
    throw new ErrorValidacion("Hay servicios repetidos.");
  }
  if (!unicos.every((t) => TIPOS_SERVICIO.includes(t))) {
    throw new ErrorValidacion("Tipo de servicio inválido.");
  }
  return unicos;
}

// Vencido = todos sus servicios terminados y el último se terminó hace rato.
function estaVencido(servicios: FilaServicio[], limite: number): boolean {
  if (servicios.length === 0) return false;
  if (!servicios.every((s) => s.estado === "terminado")) return false;

  const ultimoCambio = Math.max(
    ...servicios.map((s) => fechaSqliteAMs(s.actualizado_en)),
  );
  return ultimoCambio < limite;
}

// SQLite guarda "YYYY-MM-DD HH:MM:SS" en UTC; Date lo parsea si le marcamos la Z.
function fechaSqliteAMs(valor: string): number {
  const ms = Date.parse(valor.replace(" ", "T") + "Z");
  // Si el dato viniera raro, preferimos mostrar el auto antes que esconderlo.
  return Number.isNaN(ms) ? Date.now() : ms;
}
