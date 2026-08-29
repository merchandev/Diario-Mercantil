const fs = require('fs');
let text = fs.readFileSync('src/pages/EdicionesPublic.tsx', 'utf8');

text = text.replace(
  /const load = async \(\) => \{[\s\S]*?try \{[\s\S]*?const response = await listPublicEditions\(\)[\s\S]*?setRows\(response\.items \?\? \[\]\)[\s\S]*?\} finally \{[\s\S]*?setLoading\(false\)[\s\S]*?\}[\s\S]*?\}/,
  `const load = async () => {
    setLoading(true);
    try {
      const response = await listPublicEditions({ 
        q: q || undefined, 
        from: from || undefined, 
        to: to || undefined 
      });
      setRows(response.items ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }`
);

// We must also remove the local `q` filter if there is one.
text = text.replace(/let filtered = rows;[\s\S]*?filtered = filtered\.filter\(r => r\.code\.toLowerCase\(\)\.includes\(q\.toLowerCase\(\)\)\);[\s\S]*?\}/, 'let filtered = rows;');

fs.writeFileSync('src/pages/EdicionesPublic.tsx', text);
