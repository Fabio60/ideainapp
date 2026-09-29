export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'AI_NOT_CONFIGURED' });
    return;
  }

  const { image, fields, context } = req.body || {};
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    res.status(400).json({ error: 'Missing image' });
    return;
  }

  const wanted = Array.isArray(fields)
    ? fields.map(x => String(x || '').trim()).filter(Boolean).slice(0, 24)
    : [];
  const requested = wanted.length ? wanted : ['nome','cognome','azienda','ruolo','telefono','email','sito','indirizzo'];

  const properties = {};
  for (const key of requested) {
    properties[key] = { type: ['string','null'] };
  }

  const schema = {
    type: 'object',
    properties,
    required: requested,
    additionalProperties: false
  };

  const instructions = [
    'Analizza l’immagine fornita ed estrai solo i dati realmente visibili.',
    'Non inventare informazioni mancanti.',
    'Se un campo non è leggibile o non è presente, restituisci null.',
    'Mantieni telefono, email, URL e indirizzi nel formato più fedele possibile.',
    context ? 'Contesto: ' + String(context).slice(0, 500) : ''
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-6-luna',
        instructions,
        reasoning: { effort: 'none' },
        max_output_tokens: 1200,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: 'Estrai i campi richiesti dall’immagine.' },
            { type: 'input_image', image_url: image }
          ]
        }],
        text: {
          format: {
            type: 'json_schema',
            name: 'image_extraction',
            strict: true,
            schema
          }
        }
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error('Vision error', payload);
      res.status(response.status).json({
        error: 'VISION_REQUEST_FAILED',
        detail: payload?.error?.message || 'Unknown error'
      });
      return;
    }

    const outputText = payload.output_text || (payload.output || [])
      .flatMap(x => x.content || [])
      .find(x => x.type === 'output_text')?.text;

    if (!outputText) {
      res.status(502).json({ error: 'VISION_EMPTY_RESPONSE' });
      return;
    }

    res.status(200).json({ data: JSON.parse(outputText) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'VISION_INTERNAL_ERROR', detail: String(err?.message || err) });
  }
}
