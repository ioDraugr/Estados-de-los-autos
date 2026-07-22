// Datos de ejemplo para la vista /display (Fase 1, sin base de datos todavía).
// Autos y modelos típicos de un taller en Uruguay, con servicios y estados variados.
import type { Vehiculo } from "./types";

export const VEHICULOS_MOCK: Vehiculo[] = [
  {
    id: 1,
    marca: "Chevrolet",
    modelo: "Onix",
    color: "Blanco",
    matricula: "SBA 1234",
    fecha_ingreso: "2026-07-20",
    servicios: [
      { id: 1, vehiculo_id: 1, tipo: "instalacion", estado: "en_proceso" },
      { id: 2, vehiculo_id: 1, tipo: "polarizado", estado: "esperando" },
    ],
  },
  {
    id: 2,
    marca: "Volkswagen",
    modelo: "Gol",
    color: "Gris",
    matricula: "SCD 4589",
    fecha_ingreso: "2026-07-19",
    servicios: [
      { id: 3, vehiculo_id: 2, tipo: "polarizado", estado: "terminado" },
      { id: 4, vehiculo_id: 2, tipo: "vitrificado", estado: "en_proceso" },
    ],
  },
  {
    id: 3,
    marca: "Fiat",
    modelo: "Cronos",
    color: "Rojo",
    matricula: "SAB 7712",
    fecha_ingreso: "2026-07-21",
    servicios: [
      { id: 5, vehiculo_id: 3, tipo: "instalacion", estado: "esperando" },
      { id: 6, vehiculo_id: 3, tipo: "polarizado", estado: "esperando" },
      { id: 7, vehiculo_id: 3, tipo: "vitrificado", estado: "esperando" },
    ],
  },
  {
    id: 4,
    marca: "Suzuki",
    modelo: "Fronx",
    color: "Azul",
    matricula: "SDE 3098",
    fecha_ingreso: "2026-07-18",
    servicios: [
      { id: 8, vehiculo_id: 4, tipo: "instalacion", estado: "terminado" },
      { id: 9, vehiculo_id: 4, tipo: "polarizado", estado: "terminado" },
      { id: 10, vehiculo_id: 4, tipo: "vitrificado", estado: "terminado" },
    ],
  },
  {
    id: 5,
    marca: "Renault",
    modelo: "Kwid",
    color: "Naranja",
    matricula: "SFG 8821",
    fecha_ingreso: "2026-07-21",
    servicios: [
      { id: 11, vehiculo_id: 5, tipo: "polarizado", estado: "en_proceso" },
    ],
  },
  {
    id: 6,
    marca: "Toyota",
    modelo: "Corolla",
    color: "Negro",
    matricula: "SGH 5567",
    fecha_ingreso: "2026-07-17",
    servicios: [
      { id: 12, vehiculo_id: 6, tipo: "instalacion", estado: "terminado" },
      { id: 13, vehiculo_id: 6, tipo: "vitrificado", estado: "en_proceso" },
    ],
  },
  {
    id: 7,
    marca: "Peugeot",
    modelo: "208",
    color: "Blanco",
    matricula: "SHI 4402",
    fecha_ingreso: "2026-07-20",
    servicios: [
      { id: 14, vehiculo_id: 7, tipo: "instalacion", estado: "en_proceso" },
      { id: 15, vehiculo_id: 7, tipo: "polarizado", estado: "en_proceso" },
      { id: 16, vehiculo_id: 7, tipo: "vitrificado", estado: "esperando" },
    ],
  },
  {
    id: 8,
    marca: "Nissan",
    modelo: "Frontier",
    color: "Plata",
    matricula: "SIJ 9931",
    fecha_ingreso: "2026-07-16",
    servicios: [
      { id: 17, vehiculo_id: 8, tipo: "instalacion", estado: "terminado" },
      { id: 18, vehiculo_id: 8, tipo: "polarizado", estado: "esperando" },
    ],
  },
];
