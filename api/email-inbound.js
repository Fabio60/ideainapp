const SUPABASE_URL=process.env.SUPABASE_URL||'https://bqdwkxxdkoimqvyuuijz.supabase.co';
function first(...vals){return vals.find(v=>v!==undefined&&v!==null&&String(v).trim()!=='')||''}
export default async function handler(req,res){
  if(req.method!=='POST'){res.status(405).json({error:'Method not allowed'});return}
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret=process.env.EMAIL_INBOUND_SECRET;
  if(!serviceKey||!secret){res.status(503).json({error:'EMAIL_INBOUND_NOT_CONFIGURED'});return}
  const supplied=String(req.headers['x-ideainapp-email-secret']||req.query?.secret||'');
  if(supplied!==secret){res.status(401).json({error:'UNAUTHORIZED'});return}
  const b=req.body||{};
  const appId=String(first(b.app_id,b.appId,b.metadata?.app_id,b.headers?.['x-app-id'])).trim();
  if(!appId){res.status(400).json({error:'APP_ID_REQUIRED'});return}
  const row={
    app_id:appId,
    message_id:String(first(b.message_id,b.messageId,b.id)),
    sender:String(first(b.from,b.sender,b.envelope?.from)),
    recipient:String(first(b.to,b.recipient,b.envelope?.to)),
    subject:String(first(b.subject,'(senza oggetto)')),
    text_body:String(first(b.text,b.text_body,b.body?.text)),
    html_body:String(first(b.html,b.html_body,b.body?.html)),
    attachments:Array.isArray(b.attachments)?b.attachments:[],
    raw:b
  };
  try{
    const r=await fetch(SUPABASE_URL+'/rest/v1/ideainapp_inbox',{
      method:'POST',
      headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify(row)
    });
    if(!r.ok){
      const out=await r.json().catch(()=>({}));
      res.status(r.status).json({error:'EMAIL_STORE_FAILED',detail:out?.message||'Supabase error'});return;
    }
    res.status(200).json({ok:true});
  }catch(err){
    res.status(500).json({error:'EMAIL_INBOUND_INTERNAL_ERROR',detail:String(err?.message||err)});
  }
}
