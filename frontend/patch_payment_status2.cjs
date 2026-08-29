const fs = require('fs');
let text = fs.readFileSync('src/pages/PublicacionDetalle.tsx', 'utf8');

text = text.replace(
  /\{latestPayment \? 'Pendiente de verificaci.n' : 'A.n no reportado'\}/,
  `{paymentStatusText(latestPayment)}`
);

fs.writeFileSync('src/pages/PublicacionDetalle.tsx', text);
