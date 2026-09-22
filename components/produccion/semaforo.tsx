import React from 'react';
import { CircleCheck, CloudOff, Eye, Loader2, TriangleAlert } from 'lucide-react';
import { Semaforo } from '../../types';

/**
 * El semáforo de D3, que es lo primero que ve quien aprueba.
 *
 * **Tres estados y ninguno rojo.** El rojo prometería un bloqueo que D2 dice
 * que no existe: la auditoría avisa, y la persona decide. Y «revisar a ojo» no
 * es una advertencia sobre la pieza — es la auditoría diciendo hasta dónde
 * llegó, que es información distinta y por eso se ve distinta.
 */

export const ETIQUETA_SEMAFORO: Record<NonNullable<Semaforo>, {
  texto: (n: number) => string;
  fondo: string;
  color: string;
  Icono: typeof CircleCheck;
  ayuda: string;
}> = {
  verificada: {
    texto: () => 'Verificada',
    fondo: '#ECFDF5',
    color: '#047857',
    Icono: CircleCheck,
    ayuda: 'El texto coincide con lo aprobado y la marca no tiene observaciones.',
  },
  hallazgos: {
    texto: n => `${n} hallazgo${n === 1 ? '' : 's'}`,
    fondo: '#FFFBEB',
    color: '#B45309',
    Icono: TriangleAlert,
    ayuda: 'Hay diferencias contra el copy aprobado o juicios de marca. No bloquean: decidís vos.',
  },
  'revisar-a-ojo': {
    texto: () => 'Revisar a ojo',
    fondo: '#F2F4F7',
    color: '#475467',
    Icono: Eye,
    ayuda: 'Una parte no se pudo leer y el resto coincide. No es un hallazgo.',
  },
  'sin-auditoria': {
    texto: () => 'Sin auditoría',
    fondo: '#FFF7ED',
    color: '#C2410C',
    Icono: CloudOff,
    ayuda: 'La verificación no pudo correr. No dice nada sobre la pieza: se puede reintentar.',
  },
  auditando: {
    texto: () => 'Auditando',
    fondo: '#EFF6FF',
    color: '#1D4ED8',
    Icono: Loader2,
    ayuda: 'Corriendo. Dura un par de minutos y la pieza ya está en revisión.',
  },
};

export default function ChipSemaforo({ estado, hallazgos = 0 }: { estado: Semaforo; hallazgos?: number }) {
  if (!estado) return null;
  const { texto, fondo, color, Icono, ayuda } = ETIQUETA_SEMAFORO[estado];
  return (
    <span
      title={ayuda}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[9px] font-bold"
      style={{ backgroundColor: fondo, color }}
    >
      <Icono className={`h-3 w-3 ${estado === 'auditando' ? 'animate-spin' : ''}`} />
      {texto(hallazgos)}
    </span>
  );
}
