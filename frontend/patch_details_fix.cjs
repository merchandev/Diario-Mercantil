const fs = require('fs');
let text = fs.readFileSync('src/components/LegalRequestDetails.tsx', 'utf8');

text = text.replace(/const expediente = meta\.numero_expediente \?\? meta\.expediente \?\? '';\n  const planilla = meta\.numero_planilla \?\? meta\.planilla \?\? '';\n  const meta = typeof req\.meta/, "const meta = typeof req.meta");

text = text.replace(
  /const meta = typeof req\.meta === 'string' \? JSON\.parse\(req\.meta || '\{\}'\) : \(req\.meta || \{\}\)/,
  `const meta = typeof req.meta === 'string' ? JSON.parse(req.meta || '{}') : (req.meta || {})
  const expediente = meta.numero_expediente ?? meta.expediente ?? '';
  const planilla = meta.numero_planilla ?? meta.planilla ?? '';`
);

fs.writeFileSync('src/components/LegalRequestDetails.tsx', text);
