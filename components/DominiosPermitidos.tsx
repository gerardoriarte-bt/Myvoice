import React from 'react';
import { Plus, X } from 'lucide-react';
import { workspaceApi } from '../services/api';

/**
 * A qué dominios invita este workspace (H3.D, fase 4).
 *
 * **Vive debajo del formulario de invitar, no en Configuración.** Es una regla
 * sobre esa acción, y el momento en que a alguien se le ocurre acotarla es
 * justo cuando está invitando. Mandarla a otra pantalla la vuelve un ajuste
 * que nadie encuentra.
 *
 * Apagada es el estado normal, y se lee como una decisión y no como un campo
 * sin llenar: dice lo que hoy pasa —«se puede invitar a cualquier dominio»— y
 * ofrece acotarlo. Un candado gris con un interruptor apagado diría que falta
 * algo.
 *
 * Lo que NO hace, y conviene tenerlo escrito: esto no da acceso a nadie. Tener
 * un email `@empresa.com` no entra a ningún lado — eso el H1 lo eliminó. Acá
 * solo se frena el dedazo de invitar a un correo personal.
 */

interface Props {
  onError: (mensaje: string) => void;
}

export default function DominiosPermitidos({ onError }: Props) {
  const [dominios, setDominios] = React.useState<string[]>([]);
  const [abierto, setAbierto] = React.useState(false);
  const [nuevo, setNuevo] = React.useState('');
  const [ocupado, setOcupado] = React.useState(false);

  React.useEffect(() => {
    workspaceApi
      .dominios()
      .then(d => {
        setDominios(d.dominios ?? []);
        // Si ya está acotado, se muestra abierto: es una regla activa y
        // esconderla detrás de un enlace la haría invisible justo para quien
        // se topa con el rechazo.
        if ((d.dominios ?? []).length > 0) setAbierto(true);
      })
      .catch(() => setDominios([]));
  }, []);

  const guardar = async (lista: string[]) => {
    setOcupado(true);
    try {
      const d = await workspaceApi.guardarDominios(lista);
      setDominios(d.dominios ?? []);
      setNuevo('');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudieron guardar los dominios');
    } finally {
      setOcupado(false);
    }
  };

  const agregar = (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = nuevo.trim().toLowerCase().replace(/^@/, '');
    if (!limpio) return;
    guardar([...dominios, limpio]);
  };

  if (!abierto) {
    return (
      <p className="mt-3 text-[12px] text-[#86868B]">
        Se puede invitar a cualquier dominio.{' '}
        <button onClick={() => setAbierto(true)} className="font-medium text-[#1D1D1F] underline underline-offset-2">
          Acotar a los de la empresa
        </button>
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white p-4">
      <p className="text-[12px] font-semibold text-[#1D1D1F]">Dominios a los que se puede invitar</p>
      <p className="mt-0.5 text-[11px] leading-snug text-[#86868B]">
        No da acceso a nadie: tener un email de estos dominios no entra a ningún lado. Solo evita
        invitar por error a un correo personal, que en este workspace vería todas las marcas.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {dominios.map(d => (
          <span
            key={d}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#F5F5F7] px-2.5 py-1 text-[11px] font-medium text-[#1D1D1F]"
          >
            @{d}
            <button
              onClick={() => guardar(dominios.filter(x => x !== d))}
              disabled={ocupado}
              aria-label={`Quitar ${d}`}
              className="opacity-40 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <form onSubmit={agregar} className="flex items-center gap-1.5">
          <input
            value={nuevo}
            onChange={e => setNuevo(e.target.value)}
            placeholder="empresa.com"
            aria-label="Agregar un dominio"
            className="w-[150px] rounded-md border border-[rgba(0,0,0,0.1)] px-2.5 py-1 text-[11px] outline-none focus:border-[#1D1D1F]"
          />
          <button
            type="submit"
            disabled={ocupado || !nuevo.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-[#1D1D1F] px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-30"
          >
            <Plus className="h-3 w-3" />
            Agregar
          </button>
        </form>
      </div>

      {dominios.length === 0 && (
        <p className="mt-2.5 text-[11px] text-[#86868B]">
          Sin dominios en la lista se puede invitar a cualquiera, que es como está ahora.
        </p>
      )}
    </div>
  );
}
