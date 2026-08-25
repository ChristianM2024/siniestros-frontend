import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function Usuarios() {
  const [tab, setTab] = useState<'usuarios' | 'roles'>('usuarios');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [nuevo, setNuevo] = useState({ nombre: '', email: '', password: '', rolId: '' });

  function cargarUsuarios() {
    api.get('/usuarios').then((res) => setUsuarios(res.data));
  }
  function cargarRoles() {
    api.get('/usuarios/roles').then((res) => setRoles(res.data));
  }

  useEffect(() => {
    cargarUsuarios();
    cargarRoles();
  }, []);

  async function crearUsuario() {
    setMensaje('');
    try {
      await api.post('/usuarios', { ...nuevo, rolId: Number(nuevo.rolId) });
      setNuevo({ nombre: '', email: '', password: '', rolId: '' });
      setMensaje('Usuario creado correctamente.');
      cargarUsuarios();
    } catch (err: any) {
      setMensaje(err.response?.data?.error || 'Error al crear usuario');
    }
  }

  async function cambiarPermiso(rolId: number, pantallaId: number, campo: string, valor: boolean) {
    await api.patch(`/usuarios/roles/${rolId}/pantallas/${pantallaId}`, { [campo]: valor });
    cargarRoles();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Usuarios y Roles</h1>
      <p className="text-sm text-slate-500 mb-6">Administracion de acceso al sistema</p>

      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setTab('usuarios')}
          className={`px-4 py-2 text-sm ${tab === 'usuarios' ? 'border-b-2 border-brand-700 font-medium text-brand-700' : 'text-slate-500'}`}
        >
          Usuarios
        </button>
        <button
          onClick={() => setTab('roles')}
          className={`px-4 py-2 text-sm ${tab === 'roles' ? 'border-b-2 border-brand-700 font-medium text-brand-700' : 'text-slate-500'}`}
        >
          Roles y Permisos
        </button>
      </div>

      {mensaje && <p className="text-sm text-brand-700 mb-4">{mensaje}</p>}

      {tab === 'usuarios' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-semibold mb-3">Nuevo usuario</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Nombre" value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="Email" type="email" value={nuevo.email}
                onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="Password (min. 8 caracteres)" type="password" value={nuevo.password}
                onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })}
                className="border rounded px-3 py-2 text-sm" />
              <select value={nuevo.rolId} onChange={(e) => setNuevo({ ...nuevo, rolId: e.target.value })}
                className="border rounded px-3 py-2 text-sm">
                <option value="">Seleccione un rol</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <button onClick={crearUsuario}
              className="mt-3 bg-brand-700 text-white text-sm px-4 py-2 rounded">
              Crear usuario
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  {['Nombre', 'Email', 'Rol', 'Activo', 'Ultimo login'].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{u.nombre}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.rol?.nombre}</td>
                    <td className="px-3 py-2">{u.activo ? 'Si' : 'No'}</td>
                    <td className="px-3 py-2">{u.ultimoLogin ? new Date(u.ultimoLogin).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'roles' && (
        <div className="space-y-4">
          {roles.map((rol) => (
            <div key={rol.id} className="bg-white rounded-lg shadow p-4">
              <h2 className="text-sm font-semibold mb-3">{rol.nombre}</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium text-slate-600">Pantalla</th>
                      {['Ver', 'Crear', 'Editar', 'Eliminar'].map((h) => (
                        <th key={h} className="px-3 py-2 font-medium text-slate-600 text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rol.permisos.map((p: any) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2">{p.pantalla.nombre}</td>
                        {[
                          ['puedeVer', p.puedeVer],
                          ['puedeCrear', p.puedeCrear],
                          ['puedeEditar', p.puedeEditar],
                          ['puedeEliminar', p.puedeEliminar],
                        ].map(([campo, valor]) => (
                          <td key={campo as string} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={valor as boolean}
                              onChange={(e) => cambiarPermiso(rol.id, p.pantallaId, campo as string, e.target.checked)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}