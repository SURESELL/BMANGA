interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envoi transactionnel via Resend. Sans RESEND_API_KEY configurée (environnement
 * de développement/test), l'e-mail est journalisé côté serveur au lieu d'être
 * envoyé — jamais d'échec silencieux, jamais de faux succès affiché à l'utilisateur.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; simulated: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "noreply@preuvia.fr";

  if (!apiKey) {
    console.info(`[email:simulated] to=${input.to} subject="${input.subject}"`);
    return { sent: false, simulated: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html }),
  });

  if (!res.ok) {
    console.error(`[email:failed] status=${res.status} to=${input.to}`);
    return { sent: false, simulated: false };
  }

  return { sent: true, simulated: false };
}
