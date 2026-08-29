const fs = require('fs');
let text = fs.readFileSync('src/pages/Usuarios.tsx', 'utf8');

text = text.replace(
  /<td className="px-4 py-3 whitespace-nowrap">\s*<div className="flex items-center gap-3">\s*<div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">\s*<svg className="w-4 h-4".*?<\/svg>\s*<\/div>\s*<div>\s*<div className="font-medium text-slate-900">\{u\.name\}<\/div>\s*<div className="text-xs text-slate-500">\{u\.document\}<\/div>\s*<\/div>\s*<\/div>\s*<\/td>/s,
  `<td className="px-4 py-3 whitespace-nowrap">
                        <Link to={\`/dashboard/usuarios/\${u.id}\`} className="flex items-center gap-3 group">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">{u.name}</div>
                            <div className="text-xs text-slate-500">{u.document}</div>
                          </div>
                        </Link>
                      </td>`
);

if (!text.includes('import { Link }')) {
  text = text.replace(/import \{/, "import { Link } from 'react-router-dom'\nimport {");
}

fs.writeFileSync('src/pages/Usuarios.tsx', text);
