const BASE = 'https://api.arasaac.org/v1';

export async function searchPictograms(word) {
  try {
    const r = await fetch(`${BASE}/pictograms/fr/search/${encodeURIComponent(word)}`);
    if (!r.ok) return [];
    const data = await r.json();
    if (!data?.length) return [];
    return data.slice(0, 8).map((p) => ({
      id: p._id,
      url: `${BASE}/pictograms/${p._id}?download=false`,
      keywords: (p.keywords || []).slice(0, 3).join(', '),
    }));
  } catch {
    return [];
  }
}

export function pictogramUrl(id) {
  return `${BASE}/pictograms/${id}?download=false`;
}
