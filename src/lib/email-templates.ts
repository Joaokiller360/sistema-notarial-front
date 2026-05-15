const RAW_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const APP_URL = RAW_APP_URL.replace(/^(https?:\/\/)([^/@]+)@/, "$1$2.");

const base = (content: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { margin:0; padding:0; background:#f4f4f5; font-family:'Segoe UI',Arial,sans-serif; }
    .wrap { max-width:580px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e4e4e7; }
    .header { background:#18181b; padding:24px 32px; }
    .header h1 { margin:0; color:#fff; font-size:18px; font-weight:700; letter-spacing:-.3px; }
    .header span { color:#a1a1aa; font-size:13px; }
    .body { padding:28px 32px; }
    .label { font-size:11px; font-weight:700; color:#71717a; text-transform:uppercase; letter-spacing:.8px; margin-bottom:4px; }
    .value { font-size:15px; color:#18181b; margin-bottom:16px; line-height:1.5; }
    .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px; font-weight:600; }
    .badge-alta { background:#fef2f2; color:#dc2626; }
    .badge-media { background:#fffbeb; color:#d97706; }
    .badge-baja { background:#f0fdf4; color:#16a34a; }
    .badge-urgente { background:#fef2f2; color:#dc2626; }
    .badge-informativa { background:#eff6ff; color:#2563eb; }
    .badge-recordatorio { background:#fffbeb; color:#d97706; }
    .badge-alerta { background:#fff7ed; color:#ea580c; }
    .btn { display:inline-block; margin-top:8px; padding:11px 24px; background:#18181b; color:#fff !important; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600; }
    .footer { padding:16px 32px; background:#fafafa; border-top:1px solid #e4e4e7; font-size:12px; color:#a1a1aa; text-align:center; }
    hr { border:none; border-top:1px solid #e4e4e7; margin:20px 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Sistema Notarial</h1>
      <span>Notificación automática</span>
    </div>
    <div class="body">${content}</div>
    <div class="footer">Este mensaje fue generado automáticamente. No responder a este correo.</div>
  </div>
</body>
</html>`;

export function newsEmail(news: { id: string; title: string; description: string }) {
  // Sanitize APP_URL in case of typo (@ → .)
  const appUrl = APP_URL.replace(/^(https?:\/\/)([^/@]+)@/, "$1$2.");

  return base(`
    <p class="label">Nueva Noticia Publicada</p>
    <p style="font-size:20px;font-weight:700;color:#18181b;margin:0 0 20px;">${news.title}</p>
    <hr />
    <div style="font-size:14px;color:#27272a;line-height:1.7;">
      ${news.description}
    </div>
    <hr />
    <a href="${appUrl}/news/${news.id}" class="btn">Ver noticia en el sistema →</a>
  `);
}

export function taskEmail(task: {
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  senderName: string;
}) {
  const priorityClass = `badge-${task.priority.toLowerCase()}`;
  const due = new Date(task.dueDate).toLocaleDateString("es-EC", {
    day: "numeric", month: "long", year: "numeric",
  });
  return base(`
    <p class="label">Tienes una nueva tarea asignada</p>
    <p class="value" style="font-size:17px;font-weight:700;margin-bottom:4px;">${task.title}</p>
    <span class="badge ${priorityClass}">Prioridad ${task.priority}</span>
    <hr />
    <p class="label">Descripción</p>
    <p class="value">${task.description}</p>
    <p class="label">Asignado por</p>
    <p class="value">${task.senderName}</p>
    <p class="label">Fecha límite</p>
    <p class="value">${due}</p>
    <a href="${APP_URL}/notifications" class="btn">Ver tarea →</a>
  `);
}

export function notificationEmail(notif: {
  subject: string;
  message: string;
  type: string;
  senderName: string;
}) {
  const typeClass = `badge-${notif.type.toLowerCase()}`;
  return base(`
    <p class="label">Nueva notificación</p>
    <p class="value" style="font-size:17px;font-weight:700;margin-bottom:4px;">${notif.subject}</p>
    <span class="badge ${typeClass}">${notif.type}</span>
    <hr />
    <p class="label">Mensaje</p>
    <p class="value">${notif.message}</p>
    <p class="label">Enviado por</p>
    <p class="value">${notif.senderName}</p>
    <a href="${APP_URL}/notifications" class="btn">Ver notificación →</a>
  `);
}
