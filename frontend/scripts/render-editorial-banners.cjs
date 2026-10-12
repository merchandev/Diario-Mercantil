const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const root = path.resolve(__dirname, '../..')
const target = path.join(root, 'backend/resources/editorial/banners')
const logo = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'frontend/public/Logotipo_Diario_Mercantil.svg')).toString('base64')
const banners = [
 ['banner_header_global',1200,180,'Publicaciones mercantiles','Documentos · Convocatorias · Ediciones digitales'],
 ['banner_main_1',1200,400,'Su publicación, paso a paso','Complete sus datos, adjunte el documento y reporte su pago.'],
 ['banner_sidebar',300,500,'Consulte su edición','Encuentre su publicación y abra el documento final.'],
 ['promo_popup',800,600,'Bienvenido al Diario Mercantil','Solicite una publicación y consulte su seguimiento desde su cuenta.'],
 ['banner_history_1',1200,320,'Sus publicaciones en un solo lugar','Revise el estado de cada solicitud desde su historial.'],
 ['banner_history_2',1200,320,'Revise antes de reportar','Confirme los datos, los archivos y el importe de su orden.'],
 ['banner_history_3',1200,320,'La edición final, a su alcance','Use Ver edición cuando su publicación esté disponible.'],
]
;(async () => {
 fs.mkdirSync(target,{recursive:true})
 const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})})
 try {
  for (const [key,width,height,title,body] of banners) {
   const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1})
   const compact=height===180, vertical=width===300
   await page.setContent('<html lang="es"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#161e31;background:#faf6f0}.banner{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:'+ (vertical?'28px':compact?'16px 50px':'38px 100px')+';border-bottom:8px solid #8f1821;background:radial-gradient(circle at 0% 10%,#f1dfcc 0,transparent 45%),radial-gradient(circle at 100% 100%,#f2dcdd 0,transparent 45%)}img{width:'+ (vertical?'240px':compact?'230px':'360px')+';height:auto;margin-bottom:'+ (compact?'10px':'25px')+'}h1{font-family:Georgia,serif;font-weight:normal;font-size:'+ (vertical?'36px':compact?'42px':'58px')+';line-height:1.1;margin:0;max-width:850px}p{font-size:'+ (vertical?'19px':compact?'24px':'27px')+';line-height:1.5;margin:'+ (compact?'8px':'20px')+' 0 0;max-width:760px;color:#5d5360}.rule{width:60px;height:3px;background:#8f1821;margin-top:24px}</style><div class="banner"><img src="'+logo+'" alt="Diario Mercantil de Venezuela"><h1>'+title+'</h1><p>'+body+'</p>'+(compact?'':'<div class="rule"></div>')+'</div></html>')
   await page.screenshot({path:path.join(target,key+'.png')})
   await page.close()
  }
 } finally { await browser.close() }
 console.log('Seven institutional banners rendered.')
})().catch(error=>{console.error(error);process.exitCode=1})
