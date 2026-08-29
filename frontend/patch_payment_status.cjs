const fs = require('fs');
let text = fs.readFileSync('src/pages/PublicacionDetalle.tsx', 'utf8');

if (!text.includes('paymentStatusText')) {
  text = text.replace(
    /const onAddPayment =/,
    `const paymentStatusText = (payment: any) => {
    if (!payment) return 'Aún no reportado'
    switch (payment.status) {
      case 'Aprobado':
      case 'Verificado': return 'Pago verificado'
      case 'Rechazado': return 'Pago rechazado'
      case 'Por verificar':
      case 'Pendiente': return 'Pendiente de verificación'
      default: return payment.status || 'Sin estado'
    }
  }\n\n  const onAddPayment =`
  );
  
  text = text.replace(
    /\{latestPayment \? 'Pendiente de verificación' : 'Aún no reportado'\}/,
    `{paymentStatusText(latestPayment)}`
  );
  text = text.replace(
    /\{latestPayment \? 'Pendiente de verificacin' : 'An no reportado'\}/,
    `{paymentStatusText(latestPayment)}`
  );
  fs.writeFileSync('src/pages/PublicacionDetalle.tsx', text);
}
