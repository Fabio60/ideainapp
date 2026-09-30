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

  const { message, state } = req.body || {};
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Missing message' });
    return;
  }

  const componentTypes = [
    'card','text','input','textarea','date','time','select','radio','checkbox',
    'switch','button','buttongrid','divider','bottomnav','header','search',
    'hamburger','drawer','icon','image','list','advancedcard','slider','stepper',
    'badge','modal','tabs','progress','chart','upload','map','archive','clock'
  ];
  const superTypes = ['appheader','searchresults','dashboard','form','places','navapp'];
  const actionTypes = [
    'toast','show','hide','toggle','setText','navigate','openDrawer',
    'scrollTo','clear','increment','decrement','saveRecord','showCurrentTime','scheduleReminder','playSound',
    'openUrl','callPhone','sendEmail','openWhatsApp','share','copyClipboard','setValue',
    'addRecord','updateRecord','deleteRecord','openModal','closeModal','goBack','pickImage',
    'getLocation','openMap','filterList','sortList','confirm','delay','condition','vibrate',
    'notify','addCalendarEvent','callWebhook','focusField','analyzeImage'
  ];

  const instructions = `
Sei il motore IA di IdeaInApp, un app builder mobile-first per utenti non tecnici.
Interpreta l'intenzione dell'utente, non chiedere nomi tecnici se puoi dedurli.
Devi produrre SOLO il piano strutturato previsto dallo schema.

Principi:
- L'utente descrive obiettivi; tu scegli i mattoncini adatti.
- Usa solo questi componenti: ${componentTypes.join(', ')}.
- Usa solo questi super-mattoncini: ${superTypes.join(', ')}.
- Usa solo queste action: ${actionTypes.join(', ')}.
- iOS e Android condividono lo stesso componente logico; il renderer gestisce lo stile nativo.
- Per "quando selezioni/premi X..." crea una set_action, non un nuovo componente.
- Puoi concatenare più set_action sulla stessa sorgente: verranno eseguite in sequenza.
- Per richieste di promemoria, crea normalmente un campo testo/textarea per l'azione, un campo time per l'orario, un pulsante "Imposta promemoria", un componente archive per l'archivio e un componente clock per l'ora attuale se richiesta.
- Per "salvalo nell'archivio" usa action_type=saveRecord, target_type=archive e target_label coerente.
- Per "visualizza l'ora attuale" usa action_type=showCurrentTime, target_type=clock e target_label="Ora attuale".
- Per "notifica/promemoria all'orario scelto" aggiungi anche action_type=scheduleReminder sulla stessa sorgente.
- Per richieste come "riproduci suono", "suona", "fai un beep" o "metti un suono sul pulsante X" usa action_type=playSound sulla sorgente indicata.
- playSound è supportata e può essere configurata dal pannello Proprietà con tipo, durata e ripetizioni.
- L'utente NON deve conoscere i nomi delle action: interpreta il problema descritto e scegli autonomamente le action necessarie.
- Per "apri un sito/link" usa openUrl; telefono callPhone; email sendEmail; WhatsApp openWhatsApp; condivisione share; copia copyClipboard.
- Per riempire/svuotare campi usa setValue/clear; per liste o dati usa addRecord/updateRecord/deleteRecord.
- Per popup usa openModal/closeModal; per indietro goBack; foto/file pickImage; posizione getLocation; mappa openMap.
- Se l'utente chiede "visualizza/mostra i dati salvati", "vedi biglietti salvati", "apri archivio" o equivalente, crea o riusa un modal con properties_json={"mode":"archive","archiveKey":"reminders","title":"Biglietti salvati","visible":false} e collega la sorgente con openModal. Non creare un popup statico di solo testo.
- Se l'utente vuole leggere, riconoscere o estrarre dati da una foto/documento/biglietto, usa analyzeImage. Se serve scegliere prima la foto, concatena pickImage e analyzeImage sulla stessa sorgente.
- Se il problema riguarda un archivio di biglietti da visita, crea SEMPRE i campi Nome, Cognome, Azienda, Ruolo, Telefono, Email, Sito web e Indirizzo, oltre al componente Foto/File e all'archivio.
- Per biglietti da visita usa normalmente fields ["nome","cognome","azienda","ruolo","telefono","email","sito","indirizzo"] in properties_json. Se i campi esistono già, analyzeImage li compilerà automaticamente per corrispondenza di etichetta; puoi anche passare fieldMap in properties_json, per esempio {"fields":["nome","telefono"],"fieldMap":{"nome":"Nome","telefono":"Telefono"},"context":"Biglietto da visita"}.
- Per ricerca/filtri usa filterList e per ordinamento sortList.
- Se l'utente vuole visualizzare dati con grafici, usa component_type=chart.
- Il chart supporta chartType "bar", "pie" e "line". Passa i dati in properties_json come {"title":"Titolo","chartType":"bar","data":[{"label":"A","value":10},{"label":"B","value":20}]}.
- Scegli bar per confrontare categorie, pie per percentuali/parti di un totale con poche categorie, line per andamento nel tempo.
- Se il grafico deve derivare da dati salvati nell'app, usa properties_json con {"archiveKey":"reminders","groupBy":"Nome campo"}; il grafico si aggiorna leggendo l'archivio locale.
- L'utente non deve conoscere il tipo tecnico di grafico: deducilo dalla sua descrizione.
- Per conferme usa confirm; per ritardi delay; per regole tipo "se... allora..." usa condition.
- Per vibrazione usa vibrate; notifica immediata notify; calendario addCalendarEvent; servizi esterni/API/webhook callWebhook; per portare il cursore in un campo focusField.
- Per action avanzate inserisci i parametri extra in properties_json, ad esempio {"operator":"notEmpty"}, {"ms":1000}, {"method":"POST"}.
- Non dire che queste capacità non sono disponibili: se la richiesta è compatibile con il browser, costruisci la logica necessaria. L'analisi immagini con IA è supportata tramite analyzeImage.
- Le notifiche pianificate nel browser sono una funzione locale e possono dipendere dai permessi e dal fatto che l'app/browser resti attivo; non promettere affidabilità da sistema operativo se non supportata.
- Per una voce di menu, source_kind deve essere menu_item e source_label deve essere il testo visibile della voce.
- Se il target richiesto non esiste, usa ensure_target=true e specifica target_type/target_label.
- Per richieste ampie puoi usare super-mattoncini.
- Per richieste di sola modifica non aggiungere componenti inutili.
- Se l'utente dice "cancella tutto", "elimina tutto", "svuota la schermata", "rimuovi tutti gli elementi" o equivalente, usa UNA SOLA operation op=clear_screen. Non emettere una serie di remove_component.
- Non inventare ricette, storico, luoghi o altre funzioni non richieste.
- Il campo assistant_message deve essere breve, in italiano, e spiegare cosa verrà fatto.
`;

  const schema = {
    type: 'object',
    properties: {
      assistant_message: { type: 'string' },
      operations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            op: { type: 'string', enum: ['add_component','add_super','set_action','update_component','remove_component','clear_screen','noop'] },
            component_type: { type: 'string' },
            super_type: { type: 'string' },
            count: { type: 'integer', minimum: 1, maximum: 12 },
            source_kind: { type: 'string', enum: ['component','menu_item','button_item','none'] },
            source_label: { type: 'string' },
            target_type: { type: 'string' },
            target_label: { type: 'string' },
            action_type: { type: 'string' },
            value: { type: 'string' },
            ensure_target: { type: 'boolean' },
            properties_json: { type: 'string' }
          },
          required: [
            'op','component_type','super_type','count','source_kind','source_label',
            'target_type','target_label','action_type','value','ensure_target','properties_json'
          ],
          additionalProperties: false
        }
      }
    },
    required: ['assistant_message','operations'],
    additionalProperties: false
  };

  const compactState = {
    platform: state?.platform || 'ios',
    activeScreen: state?.activeScreen || 'NuovaIdea',
    projectMode: state?.projectMode || 'blank',
    components: state?.components || []
  };

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-6-astra',
        instructions,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Stato attuale:\n${JSON.stringify(compactState)}\n\nRichiesta utente:\n${message}`
              }
            ]
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'ideainapp_plan',
            strict: true,
            schema
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('OpenAI error', data);
      res.status(response.status).json({ error: 'AI_REQUEST_FAILED', detail: data?.error?.message || 'Unknown error' });
      return;
    }

    const outputText = data.output_text || (data.output || [])
      .flatMap(x => x.content || [])
      .find(x => x.type === 'output_text')?.text;

    if (!outputText) {
      res.status(502).json({ error: 'AI_EMPTY_RESPONSE' });
      return;
    }

    const plan = JSON.parse(outputText);
    res.status(200).json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI_INTERNAL_ERROR', detail: String(err?.message || err) });
  }
}
