export default async function handler(req,res){
  if(req.method!=='GET'){res.status(405).end();return}
  const id=String(req.query?.id||'');
  if(!/^[A-Za-z0-9_-]{8,20}$/.test(id)){res.status(400).end();return}
  const url='https://bqdwkxxdkoimqvyuuijz.supabase.co';
  const key='sb_publishable_waNH0xJIs-giJ7YNsXV-sw_t_H_UtS5';
  try{
    const r=await fetch(url+'/rest/v1/ideainapp_published_apps?id=eq.'+encodeURIComponent(id)+'&select=config',{headers:{apikey:key}});
    const rows=await r.json();
    const b64=rows?.[0]?.config?.appIconBase64;
    if(!b64){res.redirect(302,'/app-icon.svg');return}
    const buf=Buffer.from(b64,'base64');
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','public, max-age=31536000, immutable');
    res.status(200).send(buf);
  }catch(e){res.redirect(302,'/app-icon.svg')}
}
