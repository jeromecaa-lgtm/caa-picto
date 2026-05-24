export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { ownerEmail, helperName, helperContext, personName } = await req.json();

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #FAFAF8; border-radius: 16px;">
        <h1 style="font-size: 22px; color: #2D5BE3; margin-bottom: 8px;">Picto ✦</h1>
        <p style="color: #6b6b65; font-size: 14px; margin-bottom: 24px;">Nouvelle notification</p>
        <div style="background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #e5e5e5;">
          <p style="font-size: 16px; color: #1a1a18; margin: 0 0 12px;">
            <strong>${helperName}</strong>${helperContext ? ` <span style="color: #6b6b65">(${helperContext})</span>` : ''} 
            vient de rejoindre le profil de <strong>${personName}</strong>.
          </p>
          <p style="font-size: 14px; color: #6b6b65; margin: 0;">
            Vous pouvez gérer ses permissions depuis les paramètres du profil.
          </p>
        </div>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; text-align: center;">
          Application Picto CAA
        </p>
      </div>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: 'Picto CAA <onboarding@resend.dev>',
        to: ownerEmail,
        subject: `${helperName} a rejoint le profil de ${personName}`,
        html: emailHtml,
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    console.error('Notify error:', e);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
}