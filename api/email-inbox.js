const SUPABASE_URL=process.env.SUPABASE_URL||'https://bqdwkxxdkoimqvyuuijz.supabase.co';
export default async function handler(req,res){
  if(req.method!=='GET'){res.status(405).json({error:'Method not allowed'});return}
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key){res.status(503).json({error:'EMAIL_INBOX_NOT_CONFIGURED'});return}
  const appId=String(req.query?.app_id||'').trim();
  if(!appId){res.status(400).json({error:'APP_ID_REQUIRED'});return}
  try{
    const url=SUPABASE_URL+'/rest/v1/ideainapp_inbox?app_id=eq.'+encodeURIComponent(appId)+'&select=id,message_id,sender,recipient,subject,text_body,attachments,received_at&order=received_at.desc&limit=100';
    const r=await fetch(url,{headers:{apikey:key,Authorization:'Bearer '+key}});
    const out=await r.json().catch(()=>[]);
    if(!r.ok){res.status(r.status).json({error:'EMAIL_INBOX_FAILED',detail:out?.message||'Supabase error'});return}
    res.status(200).json({ok:true,messages:Array.isArray(out)?out:[]});
  }catch(err){
    res.status(500).json({error:'EMAIL_INBOX_INTERNAL_ERROR',detail:String(err?.message||err)});
  }
}
