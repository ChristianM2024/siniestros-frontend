import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ReportarSiniestro } from './pages/ReportarSiniestro';
import { Seguimiento } from './pages/Seguimiento';
import { BaseDatos } from './pages/BaseDatos';
import { Vehiculos } from './pages/Vehiculos';
import { Usuarios } from './pages/Usuarios';
import { Auditoria } from './pages/Auditoria';
import EnvioFormulario from './pages/EnvioFormulario';
import ReportarSiniestroPublico from './pages/ReportarSiniestroPublico';
import Mantenimiento from './pages/Mantenimiento';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Público: el cliente final llena su reporte aquí, sin login */}
          <Route path="/reportar-siniestro/:token" element={<ReportarSiniestroPublico />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<ProtectedRoute pantalla="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/siniestros/nuevo" element={<ProtectedRoute pantalla="reportar_siniestro"><ReportarSiniestro /></ProtectedRoute>} />
            <Route path="/siniestros/envio-formulario" element={<ProtectedRoute pantalla="envio_formulario"><EnvioFormulario /></ProtectedRoute>} />
            <Route path="/siniestros/seguimiento" element={<ProtectedRoute pantalla="seguimiento"><Seguimiento /></ProtectedRoute>} />
            <Route path="/siniestros" element={<ProtectedRoute pantalla="base_datos"><BaseDatos /></ProtectedRoute>} />
            <Route path="/siniestros/mantenimiento" element={<ProtectedRoute pantalla="mantenimiento"><Mantenimiento /></ProtectedRoute>} />
            <Route path="/vehiculos" element={<ProtectedRoute pantalla="vehiculos"><Vehiculos /></ProtectedRoute>} />
            {/* Antes: "/usuarios" — no coincidía con pantalla.ruta = "/admin/usuarios" que arma el sidebar */}
            <Route path="/admin/usuarios" element={<ProtectedRoute pantalla="usuarios"><Usuarios /></ProtectedRoute>} />
            {/* Antes: no existía ninguna <Route> para auditoria */}
            <Route path="/admin/auditoria" element={<ProtectedRoute pantalla="auditoria"><Auditoria /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
