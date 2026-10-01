export default async function handler(req,res){
  if(req.method!=='POST'){
    res.status(405).json({error:'Method not allowed'});return;
  }
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.EMAIL_FROM;
  const {to,subject,text,html,replyTo,fromName}=req.body||{};
  const recipients=Array.isArray(to)?to.map(String):[String(to||'')];
  const cleanTo=recipients.map(x=>x.trim()).filter(Boolean);
  if(!cleanTo.length){res.status(400).json({error:'EMAIL_RECIPIENT_REQUIRED'});return}
  if(!apiKey||!from){
    res.status(503).json({error:'EMAIL_NOT_CONFIGURED'});
    return;
  }
  try{
    const r=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({
        from:fromName?String(fromName).trim()+' <'+from+'>':from,
        to:cleanTo,
        subject:String(subject||'Messaggio da IdeaInApp').slice(0,300),
        text:String(text||''),
        html:html?String(html):undefined,
        reply_to:replyTo?String(replyTo):undefined
      })
    });
    const out=await r.json().catch(()=>({}));
    if(!r.ok){
      res.status(r.status).json({error:'EMAIL_SEND_FAILED',detail:out?.message||out?.error||'Provider error'});
      return;
    }
    res.status(200).json({ok:true,id:out?.id||null});
  }catch(err){
    res.status(500).json({error:'EMAIL_INTERNAL_ERROR',detail:String(err?.message||err)});
  }
}
