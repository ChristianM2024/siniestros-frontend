import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Search, Database, Car, Users, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import isirentLogo from '../assets/isirent-logo-png.png';

const ICONOS: Record<string, React.ElementType> = {
  LayoutDashboard,
  FilePlus,
  Search,
  Database,
  Car,
  Users,
};

export function Layout() {
  const { usuario, pantallas, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Barra superior solo en movil/tablet */}
      <header className="md:hidden flex items-center justify-between bg-brand-700 text-white px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={isirentLogo} alt="isirent" className="h-7" />
          <h1 className="font-semibold leading-tight text-xs">ISI-ASIST | Portal de Siniestros</h1>
        </div>
        <button onClick={() => setMenuAbierto((v) => !v)} aria-label="Abrir menu">
          {menuAbierto ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Menu desplegable en movil */}
      {menuAbierto && (
        <nav className="md:hidden bg-brand-700 text-white px-2 pb-3 space-y-1">
          {pantallas.map((p) => {
            const Icono = (p.icono && ICONOS[p.icono]) || Database;
            return (
              <NavLink
                key={p.codigo}
                to={p.ruta}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
                    isActive ? 'bg-white/15 font-medium' : 'hover:bg-white/10'
                  }`
                }
              >
                <Icono size={16} /> {p.nombre}
              </NavLink>
            );
          })}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-white/80 hover:text-white text-sm w-full"
          >
            <LogOut size={16} /> Cerrar sesion
          </button>
        </nav>
      )}

      {/* Sidebar fijo en desktop */}
      <aside className="hidden md:flex md:w-64 bg-brand-700 text-white flex-col shrink-0">
        <div className="p-4 border-b border-white/10 text-center">
          <img src={isirentLogo} alt="isirent" className="h-10 mx-auto mb-2" />
          <h1 className="font-semibold leading-tight text-sm">ISI-ASIST | Portal de Siniestros</h1>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {pantallas.map((p) => {
            const Icono = (p.icono && ICONOS[p.icono]) || Database;
            return (
              <NavLink
                key={p.codigo}
                to={p.ruta}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
                    isActive ? 'bg-white/15 font-medium' : 'hover:bg-white/10'
                  }`
                }
              >
                <Icono size={16} /> {p.nombre}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 text-sm">
          <p className="truncate">{usuario?.email}</p>
          <p className="text-xs text-white/60 mb-2">{usuario?.rolNombre}</p>
          <button onClick={logout} className="flex items-center gap-1 text-white/80 hover:text-white text-xs">
            <LogOut size={14} /> Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* Barra de navegacion inferior en movil (accesos rapidos) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 shadow-lg">
        {pantallas.slice(0, 5).map((p) => {
          const Icono = (p.icono && ICONOS[p.icono]) || Database;
          return (
            <NavLink
              key={p.codigo}
              to={p.ruta}
              className={({ isActive }) =>
                `flex flex-col items-center text-[10px] gap-0.5 px-2 ${
                  isActive ? 'text-brand-700 font-medium' : 'text-slate-500'
                }`
              }
            >
              <Icono size={18} />
              {p.nombre.split(' ')[0]}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}