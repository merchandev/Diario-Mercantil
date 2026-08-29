const fs = require('fs');
let text = fs.readFileSync('src/pages/EdicionesPublic.tsx', 'utf8');

text = text.replace(
  /useEffect\(\(\) => \{ load\(\) \}, \[\]\)/,
  `useEffect(() => { load() }, [q, from, to])`
);

text = text.replace(
  /const filtered = useMemo\(\(\) => \{[\s\S]*?return \[\.\.\.rows\][\s\S]*?\}, \[rows, q, from, to\]\)/,
  `const filtered = rows`
);

fs.writeFileSync('src/pages/EdicionesPublic.tsx', text);
