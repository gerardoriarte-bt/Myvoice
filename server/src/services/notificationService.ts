/**
 * El correo: el único lugar del servidor que habla con Resend.
 *
 * Hasta la fase 3 de H3.D esto mandaba a `RESEND_TO_EMAIL`, una casilla fija
 * del entorno. No era una limitación menor: con una segunda empresa en el
 * producto, los avisos de todas caían en la misma dirección —la del operador—
 * y nadie que tuviera que actuar se enteraba. **Ahora todo envío recibe sus
 * destinatarios**; no hay forma de mandar un correo sin decir a quién.
 *
 * Dos cosas que este archivo sostiene y conviene no deshacer:
 *
 *   · **Sin `RESEND_API_KEY` nada se cae.** El aviso ya quedó en la bandeja
 *     —el correo es un canal adicional, no el registro— y acá solo se deja la
 *     línea en el log. Es lo que hace que el flujo se pueda usar entero en
 *     desarrollo sin credenciales.
 *   · **El envío fallido se registra, no se reintenta en silencio.** Un
 *     reintento invisible termina en tres correos iguales o en ninguno, y en
 *     los dos casos sin nadie que lo sepa.
 *
 * Ver docs/plan-h3d-funciones-notificaciones.md.
 */

const REMITENTE = () => process.env.RESEND_FROM_EMAIL || 'My Voice <noreply@myvoice.lobueno.co>';
const APP = () => process.env.APP_URL || 'https://myvoice.lobueno.co';

/**
 * El envío. Devuelve si salió, para que quien llame pueda decirlo en el log
 * sin volver a mirar el entorno.
 *
 * `para` se limpia acá: sin direcciones no hay nada que mandar, y duplicadas
 * serían dos correos iguales a la misma persona —el caso del aprobador que
 * también tiene la función sin acotar—.
 */
const enviar = async (para: string[], asunto: string, html: string, contexto: string): Promise<boolean> => {
  const destinatarios = [...new Set(para.filter(Boolean))];
  if (destinatarios.length === 0) return false;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[Notification] Resend no configurado. ${contexto} → ${destinatarios.join(', ')}`);
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: REMITENTE(), to: destinatarios, subject: asunto, html }),
    });
    if (!response.ok) {
      console.error(`[Notification] Resend rechazó "${contexto}":`, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[Notification] Error enviando "${contexto}":`, error);
    return false;
  }
};

interface ReviewCompletedPayload {
  sessionTitle: string;
  reviewerName?: string | null;
  approvedCount: number;
  rejectedCount: number;
  /** Quién recibe. Antes era una casilla fija del entorno; ahora se pasa. */
  para: string[];
}

/**
 * El molde de todos los correos. Uno solo, para que el aviso de una pieza y el
 * de una revisión se vean como la misma herramienta.
 *
 * El `pie` no es decorativo: **dice por qué llegó este correo y dónde se
 * cambia**. Sin esa línea, el primer impulso de quien no lo quiere es marcarlo
 * como spam — y ahí se pierden también los que sí importan.
 */
const plantilla = (opciones: {
  rotulo: string;
  titulo: string;
  cuerpo: string;
  enlace?: { texto: string; url: string };
  pie: string;
}) => `
  <!DOCTYPE html>
  <html lang="es">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background-color:#f5f5f7;">
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:28px 32px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">My Voice</div>
      </div>
      <div style="padding:32px 32px 24px;">
        <div style="font-size:11px;font-weight:600;color:#6e6e73;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">${opciones.rotulo}</div>
        <h1 style="font-size:22px;font-weight:700;color:#1d1d1f;margin:0 0 12px;line-height:1.3;">${opciones.titulo}</h1>
        ${opciones.cuerpo}
        ${
          opciones.enlace
            ? `<a href="${opciones.enlace.url}" style="display:inline-block;margin-top:24px;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">${opciones.enlace.texto}</a>`
            : ''
        }
      </div>
      <div style="background:#f5f5f7;padding:18px 32px;border-top:1px solid #e5e5ea;">
        <p style="font-size:11px;color:#86868b;margin:0;line-height:1.6;">${opciones.pie}</p>
      </div>
    </div>
  </body>
  </html>
`;

export const notifyReviewCompleted = async (payload: ReviewCompletedPayload): Promise<void> => {
  const quien = payload.reviewerName || 'Anónimo';
  await enviar(
    payload.para,
    `Revisión completada: ${payload.sessionTitle}`,
    plantilla({
      rotulo: 'Revisión completada',
      titulo: payload.sessionTitle,
      cuerpo: `
        <p style="font-size:14px;color:#6e6e73;margin:0 0 24px;line-height:1.5;">
          <strong style="color:#1d1d1f;">${quien}</strong> envió su revisión de esta sesión.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px 0;">
          <tr>
            <td width="50%" style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:20px 16px;text-align:center;">
              <div style="font-size:36px;font-weight:800;color:#16a34a;line-height:1;">${payload.approvedCount}</div>
              <div style="font-size:12px;font-weight:600;color:#15803d;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;">Aprobadas</div>
            </td>
            <td width="50%" style="background:#fff1f2;border:1.5px solid #fca5a5;border-radius:12px;padding:20px 16px;text-align:center;">
              <div style="font-size:36px;font-weight:800;color:#dc2626;line-height:1;">${payload.rejectedCount}</div>
              <div style="font-size:12px;font-weight:600;color:#b91c1c;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;">Rechazadas</div>
            </td>
          </tr>
        </table>`,
      enlace: { texto: 'Ver la revisión', url: APP() },
      pie: 'Te llega porque vos creaste esta sesión de revisión.',
    }),
    `Revisión completada: ${payload.sessionTitle}`
  );
};

interface AvisoPayload {
  para: string[];
  /** ASIGNACION · ENTREGA */
  tipo: string;
  titulo: string;
  detalle: string | null;
  marca: string | null;
  /** A qué pieza o tablero lleva el botón. */
  url: string;
}

/**
 * El correo de los dos eventos de la bandeja.
 *
 * Es deliberadamente corto: no repite el contenido de la pieza ni el copy. El
 * correo es el **empujón**, la herramienta es el lugar donde se decide; un
 * correo que se puede leer entero sin entrar es un correo que nadie contesta.
 */
export const notifyAviso = async (payload: AvisoPayload): Promise<void> => {
  const esAsignacion = payload.tipo === 'ASIGNACION';
  await enviar(
    payload.para,
    payload.marca ? `${payload.titulo} · ${payload.marca}` : payload.titulo,
    plantilla({
      rotulo: esAsignacion ? 'Te toca producirla' : 'Te toca revisarla',
      titulo: payload.titulo,
      cuerpo: payload.detalle
        ? `<p style="font-size:15px;color:#6e6e73;margin:0;line-height:1.5;">${payload.detalle}</p>`
        : '',
      enlace: { texto: esAsignacion ? 'Ver la pieza' : 'Revisar la pieza', url: payload.url },
      pie: esAsignacion
        ? 'Te llega porque esta pieza quedó asignada a vos.'
        : 'Te llega porque tenés la función de Aprobación para esta marca. Se cambia en Equipo.',
    }),
    `${payload.tipo}: ${payload.titulo}`
  );
};

interface WorkspaceInvitePayload {
  email: string;
  workspaceName: string;
  token: string;
  expiresAt: Date;
}

/**
 * Invitación a un workspace. Igual que notifyReviewCompleted: si Resend no está
 * configurado cae a console.log con el link, para que el flujo siga siendo
 * usable en desarrollo sin credenciales de email.
 */
export const notifyWorkspaceInvite = async (payload: WorkspaceInvitePayload): Promise<void> => {
  const link = `${APP()}/?invite=${payload.token}`;
  await enviar(
    [payload.email],
    `Te invitaron a ${payload.workspaceName} en My Voice`,
    plantilla({
      rotulo: 'Invitación',
      titulo: `Te invitaron a ${payload.workspaceName}`,
      cuerpo: `<p style="font-size:14px;color:#6e6e73;margin:0;line-height:1.5;">El enlace vence el ${payload.expiresAt.toLocaleDateString('es-CO')}.</p>`,
      enlace: { texto: 'Aceptar invitación', url: link },
      pie: `Si no esperabas esta invitación, ignorá este correo: sin aceptarla no se crea ninguna cuenta.`,
    }),
    `Invitación a ${payload.workspaceName} para ${payload.email} (${link})`
  );
};
