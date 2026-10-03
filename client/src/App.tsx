import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Display } from "./pages/Display";
import { Admin } from "./pages/Admin";
import { Taller } from "./pages/Taller";

// /reportes se carga aparte, solo cuando se abre: trae Recharts, que es pesado
// y no tiene por qué cargarlo la pantalla del showroom ni la tablet del taller.
const Reportes = lazy(() =>
  import("./pages/Reportes").then((m) => ({ default: m.Reportes })),
);

// Cuatro roles: /display (clientes), /admin (vendedores), /taller (trabajadores,
// solo cambian estados) y /reportes (el dueño, con su PIN propio; a propósito
// no hay ningún link a ella desde las otras vistas). Tiempo real por Socket.IO
// en las vistas que lo necesitan.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<Display />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/taller" element={<Taller />} />
        <Route
          path="/reportes"
          element={
            <Suspense fallback={null}>
              <Reportes />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/display" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
