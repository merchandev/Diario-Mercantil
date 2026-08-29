const fs = require('fs');
let text = fs.readFileSync('src/pages/Usuarios.tsx', 'utf8');

text = text.replace(
  /<td className="px-4 py-3 whitespace-nowrap">\s*<div className="flex items-center gap-3">/,
  `<td className="px-4 py-3 whitespace-nowrap">
                        <Link to={\`/dashboard/usuarios/\${u.id}\`} className="flex items-center gap-3 group">`
);

text = text.replace(
  /<div className="font-medium text-slate-900">\{u\.name\}<\/div>\s*<div className="text-xs text-slate-500">\{u\.document\}<\/div>\s*<\/div>\s*<\/div>\s*<\/td>/,
  `<div className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">{u.name}</div>
                            <div className="text-xs text-slate-500">{u.document}</div>
                          </div>
                        </Link>
                      </td>`
);

text = text.replace(
  /import \{ IconSearch, IconFilter, IconEdit, IconCheck, IconX, IconLock \} from '\.\.\/components\/icons'/,
  `import { IconSearch, IconFilter, IconEdit, IconCheck, IconX, IconLock } from '../components/icons'\nimport { Link } from 'react-router-dom'`
);

fs.writeFileSync('src/pages/Usuarios.tsx', text);
