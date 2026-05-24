export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { ownerEmail, helperName, helperContext, personName } = await req.json();

    // Utilise l'API Anthropic pour générer un email propre
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Écris un email court en français pour notifier que ${helperName}${helperContext ? ` (${helperContext})` : ''} vient de rejoindre le profil de ${personName} sur l'application Picto CAA. Email destiné au propriétaire du profil. Sois concis et chaleureux. Donne juste le corps du mail, pas de sujet.`
        }]
      }),
    });

    const data = await response.json();
    const emailBody = data.content?.[0]?.text || '';

    // Pour l'instant on log — plus tard on pourrait intégrer Resend ou SendGrid
    console.log('Notification email to:', ownerEmail, '\n', emailBody);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
}