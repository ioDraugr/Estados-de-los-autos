import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Display } from "./pages/Display";

// Fase 1: solo /display activa. /admin y tiempo real llegan en fases siguientes.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<Display />} />
        <Route path="*" element={<Navigate to="/display" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
