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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<ProtectedRoute pantalla="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/siniestros/nuevo" element={<ProtectedRoute pantalla="reportar_siniestro"><ReportarSiniestro /></ProtectedRoute>} />
            <Route path="/siniestros/seguimiento" element={<ProtectedRoute pantalla="seguimiento"><Seguimiento /></ProtectedRoute>} />
            <Route path="/siniestros" element={<ProtectedRoute pantalla="base_datos"><BaseDatos /></ProtectedRoute>} />
            <Route path="/vehiculos" element={<ProtectedRoute pantalla="vehiculos"><Vehiculos /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute pantalla="usuarios"><Usuarios /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
