import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api/client';

export interface Pantalla {
  codigo: string;
  nombre: string;
  ruta: string;
  icono: string | null;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

interface Usuario {
  id: number;
  email: string;
  rolId: number;
  rolNombre: string;
}

interface AuthContextValue {
  usuario: Usuario | null;
  pantallas: Pantalla[];
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  tienePermiso: (codigo: string, accion?: 'ver' | 'crear' | 'editar' | 'eliminar') => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [pantallas, setPantallas] = useState<Pantalla[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargarSesion() {
    const token = localStorage.getItem('token');
    if (!token) {
      setCargando(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUsuario(data.usuario);
      setPantallas(data.pantallas);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarSesion();
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUsuario(data.usuario);
    await cargarSesion();
  }

  function logout() {
    localStorage.removeItem('token');
    setUsuario(null);
    setPantallas([]);
  }

  function tienePermiso(codigo: string, accion: 'ver' | 'crear' | 'editar' | 'eliminar' = 'ver') {
    const pantalla = pantallas.find((p) => p.codigo === codigo);
    if (!pantalla) return false;
    if (accion === 'ver') return true;
    if (accion === 'crear') return pantalla.puedeCrear;
    if (accion === 'editar') return pantalla.puedeEditar;
    return pantalla.puedeEliminar;
  }

  return (
    <AuthContext.Provider value={{ usuario, pantallas, cargando, login, logout, tienePermiso }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
