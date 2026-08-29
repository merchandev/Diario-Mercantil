const fs = require('fs');
let text = fs.readFileSync('src/pages/Usuarios.tsx', 'utf8');

text = text.replace(
  /<td className="px-4 py-2">\{u\.document\}<\/td>\s*<td className="px-4 py-2">\{u\.name\}<\/td>/,
  `<td className="px-4 py-2"><Link to={\`/dashboard/usuarios/\${u.id}\`} className="text-brand-600 hover:underline">{u.document}</Link></td>
                <td className="px-4 py-2"><Link to={\`/dashboard/usuarios/\${u.id}\`} className="font-medium text-slate-900 hover:text-brand-600">{u.name}</Link></td>`
);

if (!text.includes("import { Link }")) {
  text = "import { Link } from 'react-router-dom'\n" + text;
}

fs.writeFileSync('src/pages/Usuarios.tsx', text);
