interface ReviewCompletedPayload {
  sessionTitle: string;
  reviewerName?: string | null;
  approvedCount: number;
  rejectedCount: number;
}

export const notifyReviewCompleted = async (payload: ReviewCompletedPayload): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.RESEND_TO_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'My Voice <noreply@myvoice.lobueno.co>';

  if (!apiKey || !toEmail) {
    console.log(
      `[Notification] Resend no configurado. Revisión completada: "${payload.sessionTitle}" por ${payload.reviewerName || 'Anónimo'} — ✅ ${payload.approvedCount} aprobadas / ❌ ${payload.rejectedCount} rechazadas`
    );
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `Revisión completada: ${payload.sessionTitle}`,
        html: `
          <!DOCTYPE html>
          <html lang="es">
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f7;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">

              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 28px 32px; text-align: center;">
                <div style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">My Voice</div>
                <div style="font-size: 12px; color: #8a8aaa; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase;">Motor de Copy · Vive Terpel</div>
              </div>

              <!-- Body -->
              <div style="padding: 32px 32px 24px;">
                <div style="font-size: 11px; font-weight: 600; color: #6e6e73; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">Revisión completada</div>
                <h1 style="font-size: 22px; font-weight: 700; color: #1d1d1f; margin: 0 0 8px; line-height: 1.3;">${payload.sessionTitle}</h1>
                <p style="font-size: 14px; color: #6e6e73; margin: 0 0 28px; line-height: 1.5;">
                  <strong style="color: #1d1d1f;">${payload.reviewerName || 'Anónimo'}</strong>
                  ha enviado su revisión de esta sesión.
                </p>

                <!-- Stats -->
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 12px 0; margin-bottom: 28px;">
                  <tr>
                    <td width="50%" style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 12px; padding: 20px 16px; text-align: center;">
                      <div style="font-size: 36px; font-weight: 800; color: #16a34a; line-height: 1;">${payload.approvedCount}</div>
                      <div style="font-size: 12px; font-weight: 600; color: #15803d; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Aprobadas</div>
                    </td>
                    <td width="50%" style="background: #fff1f2; border: 1.5px solid #fca5a5; border-radius: 12px; padding: 20px 16px; text-align: center;">
                      <div style="font-size: 36px; font-weight: 800; color: #dc2626; line-height: 1;">${payload.rejectedCount}</div>
                      <div style="font-size: 12px; font-weight: 600; color: #b91c1c; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Rechazadas</div>
                    </td>
                  </tr>
                </table>

                <p style="font-size: 13px; color: #6e6e73; margin: 0; line-height: 1.6;">
                  Ingresa a My Voice para ver el desglose completo, los comentarios y las variaciones revisadas en la sección <strong>Collaboration</strong>.
                </p>
              </div>

              <!-- Footer -->
              <div style="background: #f5f5f7; padding: 20px 32px; border-top: 1px solid #e5e5ea; text-align: center;">
                <p style="font-size: 11px; color: #86868b; margin: 0; line-height: 1.6;">
                  Este mensaje fue generado automáticamente por <strong>My Voice</strong>.<br>
                  <a href="https://myvoice.lobueno.co" style="color: #6366f1; text-decoration: none;">myvoice.lobueno.co</a>
                </p>
              </div>

            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[Notification] Resend error:', err);
    }
  } catch (err) {
    console.error('[Notification] Error al enviar notificación:', err);
  }
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
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'My Voice <noreply@myvoice.lobueno.co>';
  const appUrl = process.env.APP_URL || 'https://myvoice.lobueno.co';
  const link = `${appUrl}/?invite=${payload.token}`;

  if (!apiKey) {
    console.log(
      `[Notification] Resend no configurado. Invitación a "${payload.workspaceName}" para ${payload.email}: ${link}`
    );
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.email],
        subject: `Te invitaron a ${payload.workspaceName} en My Voice`,
        html: `
          <!DOCTYPE html>
          <html lang="es">
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0;padding:0;background-color:#f5f5f7;">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
              <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:28px 32px;text-align:center;">
                <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">My Voice</div>
              </div>
              <div style="padding:32px;">
                <p style="font-size:16px;color:#1d1d1f;margin:0 0 16px;">
                  Te invitaron a trabajar en <strong>${payload.workspaceName}</strong>.
                </p>
                <p style="font-size:14px;color:#6e6e73;margin:0 0 24px;">
                  El enlace vence el ${payload.expiresAt.toLocaleDateString('es-CO')}.
                </p>
                <a href="${link}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">
                  Aceptar invitación
                </a>
              </div>
              <div style="padding:16px 32px 28px;border-top:1px solid #ecedf1;">
                <div style="font-size:12px;color:#8a8aaa;">myvoice.lobueno.co</div>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });
    if (!response.ok) {
      console.error('[Notification] Resend rechazó la invitación:', await response.text());
    }
  } catch (error) {
    console.error('[Notification] Error enviando la invitación:', error);
  }
};
