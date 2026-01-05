import { useEffect, useState } from 'react'
import { PageBlock, getPagePublic } from '../lib/api'
import { useParams } from 'react-router-dom'

function RenderBlocks({blocks}:{blocks:PageBlock[]}){
  return (
    <div className="prose max-w-none space-y-4">
      {blocks.map(b=>{
        if (b.type==='heading'){
          const Tag = `h${b.props.level}` as any
          return <Tag key={b.id} className={{left:'text-left',center:'text-center',right:'text-right'}[b.props.align]}>{b.props.text}</Tag>
        }
        if (b.type==='paragraph'){
          return <p key={b.id} className={{left:'text-left',center:'text-center',right:'text-right'}[b.props.align]}>{b.props.text}</p>
        }
        return <img key={b.id} src={(b as any).props.url} alt={(b as any).props.alt||''} className="max-w-full rounded"/>
      })}
    </div>
  )
}

export default function PagePublic(){
  const { slug } = useParams()
  const [page, setPage] = useState<{ title:string; header_html?:string; footer_html?:string; body_blocks:PageBlock[] }|null>(null)
  const [notFound, setNotFound] = useState(false)
  useEffect(()=>{
    if (!slug) return
    getPagePublic(slug).then(r=> setPage({ title:r.page.title, header_html:r.page.header_html, footer_html:r.page.footer_html, body_blocks:r.page.body_blocks||[] })).catch(()=> setNotFound(true))
  }, [slug])

  if (notFound) return <div className="min-h-screen grid place-items-center p-8"><div className="text-center"><div className="text-2xl font-semibold">Página no encontrada</div><div className="text-slate-600">Verifique el enlace</div></div></div>

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto p-6">
        {page && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold">{page.title}</h1>
            </div>
            <article className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              {page.header_html ? <div dangerouslySetInnerHTML={{__html:page.header_html}}/> : null}
              <RenderBlocks blocks={page.body_blocks||[]}/>
              {page.footer_html ? <div dangerouslySetInnerHTML={{__html:page.footer_html}}/> : null}
            </article>
          </>
        )}
      </div>
    </div>
  )
}
