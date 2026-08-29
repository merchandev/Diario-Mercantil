const fs = require('fs');
let text = fs.readFileSync('src/pages/PublicacionDetalle.tsx', 'utf8');

const regexFormFields = /<input className="input" name="type" placeholder="Tipo \(ej\. Pago Móvil\)" \/>[\s\S]*?<input className="input" name="mobile_phone" placeholder="Teléfono" \/>/;
const replacementFormFields = `<select className="input" name="type" required>
            <option value="pago_movil">Pago Móvil</option>
          </select>
          <input className="input" type="number" step="0.01" name="amount_bs" placeholder="Monto Bs" required />
          <select className="input" name="pstatus">
            <option value="Verificado">Verificado</option>
            <option value="Por verificar">Por verificar</option>
          </select>
          <input className="input" name="mobile_phone" placeholder="Teléfono (Ej: 04141234567)" pattern="^04(12|14|16|22|24|26)\\d{7}$" required />`;
text = text.replace(regexFormFields, replacementFormFields);
fs.writeFileSync('src/pages/PublicacionDetalle.tsx', text);
