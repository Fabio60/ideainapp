export default async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({error:'Method not allowed'});return}
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey){res.status(503).json({error:'AI_NOT_CONFIGURED'});return}
  const {summary,title}=req.body||{};
  const appTitle=(title||'La mia App').slice(0,80);
  const prompt=[
    'Create a polished square mobile app icon, 1024x1024, no text, no letters, no words.',
    'Modern iOS/Android app-store style, simple central symbol, strong silhouette, rounded-square composition.',
    'The icon must clearly represent this app concept:',
    String(summary||'generic productivity app').slice(0,1200),
    'Prefer one clear metaphor, clean gradients, high contrast, no mockup frame, no device frame, no watermark.',
    'App title context: '+appTitle
  ].join('\n');
  try{
    const r=await fetch('https://api.openai.com/v1/images/generations',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-2.5-flare',
        prompt,
        size:'1024x1024',
        quality:'low',
        output_format:'png',
        n:1
      })
    });
    const data=await r.json();
    if(!r.ok){res.status(r.status).json({error:'IMAGE_GENERATION_FAILED',detail:data?.error?.message||'Unknown error'});return}
    const b64=data?.data?.[0]?.b64_json;
    if(!b64){res.status(502).json({error:'EMPTY_IMAGE'});return}
    res.status(200).json({image_base64:b64});
  }catch(err){
    res.status(500).json({error:'ICON_INTERNAL_ERROR',detail:String(err?.message||err)});
  }
}
