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
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1d1d1f;">
            <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 8px;">Revisión completada</h2>
            <p style="font-size: 14px; color: #6e6e73; margin: 0 0 24px;">
              <strong style="color: #1d1d1f;">${payload.reviewerName || 'Anónimo'}</strong>
              envió su revisión de <strong style="color: #1d1d1f;">${payload.sessionTitle}</strong>.
            </p>
            <div style="display: flex; gap: 16px; margin-bottom: 24px;">
              <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; text-align: center;">
                <div style="font-size: 22px; font-weight: 700; color: #16a34a;">${payload.approvedCount}</div>
                <div style="font-size: 11px; color: #15803d; margin-top: 2px;">Aprobadas</div>
              </div>
              <div style="flex: 1; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px 16px; text-align: center;">
                <div style="font-size: 22px; font-weight: 700; color: #dc2626;">${payload.rejectedCount}</div>
                <div style="font-size: 11px; color: #b91c1c; margin-top: 2px;">Rechazadas</div>
              </div>
            </div>
            <p style="font-size: 12px; color: #86868b; margin: 0;">
              Entra a My Voice para ver el desglose completo en el tab Collaboration.
            </p>
          </div>
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
