import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({
  children,
  pantalla,
}: {
  children: ReactNode;
  pantalla?: string;
}) {
  const { usuario, cargando, tienePermiso } = useAuth();

  if (cargando) return <div className="p-8 text-center text-slate-500">Cargando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (pantalla && !tienePermiso(pantalla)) {
    return (
      <div className="p-8 text-center text-red-600">
        No tiene permiso para ver esta pantalla.
      </div>
    );
  }
  return <>{children}</>;
}
