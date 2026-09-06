import { useState, FormEvent } from 'react';
import { Search, Send, Mail, MessageCircle, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { api } from '../api/client';

interface Vehiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  cliente: { id: number; nombre: string; celular: string | null; correo: string | null } | null;
}

type Canal = 'CORREO' | 'WHATSAPP' | 'AMBOS';

interface RespuestaEnvio {
  ok: boolean;
  token: string;
  correoEnviado: boolean;
  whatsappUrl: string | null;
}

export default function EnvioFormulario() {
  const [placaBusqueda, setPlacaBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<Vehiculo[]>([]);
  const [busquedaHecha, setBusquedaHecha] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  const [vehiculoSel, setVehiculoSel] = useState<Vehiculo | null>(null);
  const [canal, setCanal] = useState<Canal>('AMBOS');
  const [correoCliente, setCorreoCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespuestaEnvio | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function buscarVehiculo(e: FormEvent) {
  e.preventDefault();
  if (!placaBusqueda.trim()) return;

  setBuscando(true);
  setErrorBusqueda(null);
  setBusquedaHecha(false);
  setVehiculoSel(null);
  setResultado(null);

  try {
    const { data } = await api.get<Vehiculo>(`/vehiculos/buscar/${placaBusqueda.trim()}`);
    setResultados(data ? [data] : []);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      setResultados([]); // no encontrado, no es un error real
    } else {
      setErrorBusqueda('No se pudo buscar el vehículo. Intenta de nuevo.');
    }
  } finally {
    setBuscando(false);
    setBusquedaHecha(true);
  }
}

  function seleccionarVehiculo(v: Vehiculo) {
  setVehiculoSel(v);
  setResultado(null);
  setErrorEnvio(null);
  setCorreoCliente(v.cliente?.correo ?? '');
  setTelefonoCliente(v.cliente?.celular ?? '');
}

  async function enviarSolicitud(e: FormEvent) {
    e.preventDefault();
    if (!vehiculoSel) return;

    if ((canal === 'CORREO' || canal === 'AMBOS') && !correoCliente.trim()) {
      setErrorEnvio('Ingresa el correo del cliente para este canal.');
      return;
    }
    if ((canal === 'WHATSAPP' || canal === 'AMBOS') && !telefonoCliente.trim()) {
      setErrorEnvio('Ingresa el teléfono del cliente para este canal.');
      return;
    }

    setEnviando(true);
    setErrorEnvio(null);
    setResultado(null);

    try {
      const { data } = await api.post<RespuestaEnvio>('/siniestros/solicitudes-formulario', {
        vehiculoId: vehiculoSel.id,
        correoCliente: correoCliente.trim() || undefined,
        telefonoCliente: telefonoCliente.trim() || undefined,
        canal,
      });
      setResultado(data);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'No se pudo enviar la solicitud. Intenta de nuevo.';
      setErrorEnvio(msg);
    } finally {
      setEnviando(false);
    }
  }

  function linkCompleto(token: string) {
    return `${window.location.origin}/reportar-siniestro/${token}`;
  }

  async function copiarLink() {
    if (!resultado) return;
    await navigator.clipboard.writeText(linkCompleto(resultado.token));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function reiniciar() {
    setVehiculoSel(null);
    setResultado(null);
    setErrorEnvio(null);
    setCorreoCliente('');
    setTelefonoCliente('');
    setCanal('AMBOS');
    setPlacaBusqueda('');
    setResultados([]);
    setBusquedaHecha(false);
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Envío de Formulario</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Busca el vehículo por placa y envía al cliente el link para que reporte el siniestro él mismo.
        </p>
      </div>

      {/* Paso 1: buscar vehículo */}
      <form onSubmit={buscarVehiculo} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={placaBusqueda}
            onChange={(e) => setPlacaBusqueda(e.target.value.toUpperCase())}
            placeholder="Placa del vehículo, ej. ABC-1234"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={buscando || !placaBusqueda.trim()}
          className="px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg
                     hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {errorBusqueda && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorBusqueda}
        </div>
      )}

      {busquedaHecha && !errorBusqueda && resultados.length === 0 && (
        <p className="text-sm text-slate-500 mb-6">No se encontró ningún vehículo con esa placa.</p>
      )}

      {/* Resultados de búsqueda */}
      {resultados.length > 0 && !vehiculoSel && (
        <div className="space-y-2 mb-6">
          {resultados.map((v) => (
            <button
              key={v.id}
              onClick={() => seleccionarVehiculo(v)}
              className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg
                         hover:border-slate-400 hover:bg-slate-50 transition-colors"
            >
              <div className="font-medium text-slate-900">{v.placa}</div>
              <div className="text-sm text-slate-500">
                {v.marca} {v.modelo} — {v.cliente?.nombre ?? 'Sin cliente'}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Paso 2: vehículo seleccionado + formulario de envío */}
      {vehiculoSel && !resultado && (
        <form onSubmit={enviarSolicitud} className="border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Vehículo seleccionado</div>
              <div className="font-medium text-slate-900">{vehiculoSel.placa}</div>
              <div className="text-sm text-slate-500">
                {vehiculoSel.marca} {vehiculoSel.modelo} — {vehiculoSel.cliente?.nombre ?? 'Sin cliente'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVehiculoSel(null)}
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              Cambiar
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Canal de envío</label>
            <div className="grid grid-cols-3 gap-2">
              {(['CORREO', 'WHATSAPP', 'AMBOS'] as Canal[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCanal(c)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    canal === c
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {c === 'CORREO' ? 'Correo' : c === 'WHATSAPP' ? 'WhatsApp' : 'Ambos'}
                </button>
              ))}
            </div>
          </div>

          {(canal === 'CORREO' || canal === 'AMBOS') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo del cliente</label>
              <input
                type="email"
                value={correoCliente}
                onChange={(e) => setCorreoCliente(e.target.value)}
                placeholder="cliente@correo.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          )}

          {(canal === 'WHATSAPP' || canal === 'AMBOS') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono del cliente</label>
              <input
                type="tel"
                value={telefonoCliente}
                onChange={(e) => setTelefonoCliente(e.target.value)}
                placeholder="0991234567"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
          )}

          {errorEnvio && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorEnvio}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-sm
                       font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
            {enviando ? 'Enviando…' : 'Enviar formulario al cliente'}
          </button>
        </form>
      )}

      {/* Paso 3: confirmación */}
      {resultado && vehiculoSel && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-green-800 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            Solicitud enviada
          </div>

          <div className="space-y-2 text-sm">
            {(canal === 'CORREO' || canal === 'AMBOS') && (
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 shrink-0" />
                {resultado.correoEnviado
                  ? 'Correo enviado al cliente.'
                  : 'No se pudo enviar el correo automáticamente — copia el link y envíalo manualmente.'}
              </div>
            )}
            {resultado.whatsappUrl && (
              <a
                href={resultado.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-green-700 hover:underline"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                Abrir mensaje de WhatsApp
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <code className="text-xs text-slate-600 flex-1 truncate">{linkCompleto(resultado.token)}</code>
            <button
              type="button"
              onClick={copiarLink}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <button
            type="button"
            onClick={reiniciar}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Enviar otra solicitud
          </button>
        </div>
      )}
    </div>
  );
}
