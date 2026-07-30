import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Display } from "./pages/Display";
import { Admin } from "./pages/Admin";

// Fase 3: /display (clientes) y /admin (trabajadores). El tiempo real llega en
// la Fase 4; por ahora /admin refetchea tras cada acción.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<Display />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/display" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
