import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Display } from "./pages/Display";
import { Admin } from "./pages/Admin";
import { Taller } from "./pages/Taller";

// Tres roles: /display (clientes), /admin (vendedores) y /taller (trabajadores,
// solo cambian estados). Todos con tiempo real por Socket.IO en las vistas que
// lo necesitan.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<Display />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/taller" element={<Taller />} />
        <Route path="*" element={<Navigate to="/display" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
