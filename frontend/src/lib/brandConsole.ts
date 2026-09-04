const binarySignature = [
  '01001101 01000101 01010010 01000011 01001000 01000001 01001110',
  '00101110 01000100 01000101 01010110 00100000 11000011 10010111',
  '00100000 01000101 01010000 01010010 01000101 01010011 01010011',
  '01001001 01010110 01001111',
].join('\n')

const ownershipNotice = [
  'Desarrollo e ingeniería de software propiedad de Merchan.Dev y Epressivo Venezuela, C.A.',
  '',
  'Todos los derechos de propiedad intelectual e industrial sobre el código fuente, bases de datos, flujos de trabajo y arquitectura están reservados.',
  'Queda estrictamente prohibida la reproducción, modificación, copia, distribución, comercialización, ingeniería inversa, plagio o cualquier uso no autorizado, total o parcial, de los elementos desarrollados en este proyecto sin consentimiento previo, expreso y por escrito de los autores.',
  'Toda infracción será sujeta a las acciones civiles y penales correspondientes.',
].join('\n')

export function printOwnershipConsoleSignature() {
  const browserConsole = Reflect.get(globalThis, 'console') as Console | undefined
  if (!browserConsole) return

  browserConsole.info(
    `%c${binarySignature}%c\n  MERCHAN.DEV  ×  EPRESSIVO VENEZUELA, C.A.  `,
    'display:block;background:#070b14;color:#35f2a1;padding:16px 20px 8px;border:1px solid #1c624b;border-bottom:0;border-radius:10px 10px 0 0;font:600 11px/1.65 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:.08em;text-shadow:0 0 8px rgba(53,242,161,.55)',
    'display:block;background:linear-gradient(90deg,#070b14,#16102b);color:#ffffff;padding:8px 20px 16px;border:1px solid #1c624b;border-top:0;border-radius:0 0 10px 10px;font:800 15px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:.06em',
  )
  browserConsole.info(
    `%c${ownershipNotice}`,
    'display:block;max-width:760px;background:#0f172a;color:#cbd5e1;padding:16px 20px;border-left:4px solid #35f2a1;font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
  )
}
