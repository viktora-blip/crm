export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  const prompt = `Use web_search to fetch this Sreality.cz property listing and extract data.
URL: ${url}
Reply with ONLY a raw JSON object, no markdown, no text before or after:
{"addr":"address or title","price":3500000,"disp":"2+1","area":65,"loc":"Praha 2","description":"first 150 chars of description"}
Use null for missing fields. price must be integer CZK.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  if (data.error) return res.status(500).json({ error: data.error.message });

  const text = (data.content || []).map(b => b.type === 'text' ? b.text : '').join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return res.status(422).json({ error: 'Nepodařilo se načíst data z inzerátu.' });

  const parsed = JSON.parse(match[0]);
  res.status(200).json(parsed);
}
