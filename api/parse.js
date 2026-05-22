export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  const prompt = `Fetch this Sreality.cz property listing URL and extract data.
URL: ${url}
Reply with ONLY a raw JSON object, no markdown, no text before or after:
{"addr":"address or title","price":3500000,"disp":"2+1","area":65,"loc":"Praha 2","description":"first 150 chars of description"}
Use null for missing fields. price must be integer CZK.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://crm-omega-henna.vercel.app',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  if (data.error) return res.status(500).json({ error: data.error.message });

  const text = data.choices?.[0]?.message?.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return res.status(422).json({ error: 'Nepodařilo se načíst data z inzerátu.' });

  try {
    const parsed = JSON.parse(match[0]);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(422).json({ error: 'Chyba při parsování dat.' });
  }
}
