const asciiArt = [
  '  __  __               _                  ____             _ ',
  ' |  \\/  | ___ _ __ ___| |__   __ _ _ __  |  _ \\  _____   _| |',
  ' | |\\/| |/ _ \\ \'__/ __| \'_ \\ / _` | \'_ \\ | | | |/ _ \\ \\ / / |',
  ' | |  | |  __/ | | (__| | | | (_| | | | || |_| |  __/\\ V /|_|',
  ' |_|  |_|\\___|_|  \\___|_| |_|\\__,_|_| |_||____/ \\___| \\_/ (_)',
  '                                                             ',
  '                  < Programmer Full-Stack />                 ',
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
    `%c${asciiArt}`,
    'color:#35f2a1;font:800 12px/1.15 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;text-shadow:0 0 8px rgba(53,242,161,.6)'
  )
  browserConsole.info(
    `%c\n  MERCHAN.DEV  ×  EPRESSIVO VENEZUELA, C.A.  \n`,
    'display:block;background:linear-gradient(90deg,#070b14,#16102b);color:#ffffff;padding:8px 20px;border:1px solid #1c624b;border-radius:8px;font:800 15px/1.5 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:.06em'
  )
  browserConsole.info(
    `%c${ownershipNotice}`,
    'display:block;max-width:760px;background:#0f172a;color:#cbd5e1;padding:16px 20px;border-left:4px solid #35f2a1;font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
  )
}
