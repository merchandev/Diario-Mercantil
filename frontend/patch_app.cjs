const fs = require('fs');
let text = fs.readFileSync('src/App.tsx', 'utf8');

if (!text.includes('UsuarioDetalle')) {
  text = text.replace(
    /import Usuarios from '\.\/pages\/Usuarios'/,
    "import Usuarios from './pages/Usuarios'\nimport UsuarioDetalle from './pages/UsuarioDetalle'"
  );
  
  text = text.replace(
    /<Route path="usuarios" element=\{<Usuarios \/>} \/>/,
    `<Route path="usuarios" element={<Usuarios />} />
          <Route path="usuarios/:id" element={<UsuarioDetalle />} />`
  );
  fs.writeFileSync('src/App.tsx', text);
}
