import { useState, FormEvent } from 'react';
import { api } from '../api/client';

export function CambiarPassword() {
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMensaje(null);

    if (passwordNueva.length < 8) {
      setMensaje({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (passwordNueva !== confirmarPassword) {
      setMensaje({ tipo: 'error', texto: 'La confirmación no coincide con la nueva contraseña.' });
      return;
    }

    setGuardando(true);
    try {
      await api.put('/usuarios/me/password', { passwordActual, passwordNueva });
      setMensaje({ tipo: 'ok', texto: 'Contraseña actualizada correctamente.' });
      setPasswordActual('');
      setPasswordNueva('');
      setConfirmarPassword('');
    } catch (err: any) {
      const texto = err?.response?.data?.error || 'No se pudo actualizar la contraseña.';
      setMensaje({ tipo: 'error', texto });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Cambiar Contraseña</h1>
      <p className="text-slate-500 mb-6">Actualiza la contraseña de tu cuenta</p>

      <div className="bg-white rounded-lg shadow p-6 max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña actual</label>
            <input
              type="password"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              required
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              required
              minLength={8}
              placeholder="Min. 8 caracteres"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>

          {mensaje && (
            <p className={`text-sm ${mensaje.tipo === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {mensaje.texto}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="bg-brand-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-brand-800 transition disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CambiarPassword;