export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { text, categories } = await req.json();

    const prompt = `Analyse cette phrase française pour une application CAA (Communication Alternative et Augmentée).
Phrase : "${text}"
Catégories activées : ${categories.join(', ')}

Extrais uniquement les mots pertinents selon les catégories activées :
- core : noms communs, lieux, personnes, salutations (bonjour, merci, oui, non...)
- verb : verbes d'action
- qualifier : adjectifs et états

Réponds UNIQUEMENT en JSON valide sans markdown :
{"words": [{"word": "mot", "category": "core|verb|qualifier"}]}

Garde l'ordre des mots de la phrase. Maximum 6 mots.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const raw = data.content?.[0]?.text || '{"words":[]}';
    const match = raw.match(/\{[\s\S]*\}/);
    const result = match ? JSON.parse(match[0]) : { words: [] };

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ words: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}