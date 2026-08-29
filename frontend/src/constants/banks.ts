export const BANCOS_VENEZUELA = [
  '0134 - Banesco',
  '0105 - Mercantil',
  '0108 - BBVA Provincial',
  '0191 - Banco Nacional de Crédito (BNC)',
  '0172 - Bancamiga',
  '0114 - Bancaribe',
  '0115 - Banco Exterior',
  '0151 - Banco Fondo Común (BFC)',
  '0104 - Banco Venezolano de Crédito',
  '0171 - Banco Activo',
  '0174 - Banplus',
  '0138 - Banco Plaza',
  '0156 - 100% Banco',
  '0157 - DelSur',
  '0102 - Banco de Venezuela (BDV)',
  '0163 - Banco del Tesoro',
  '0175 - Banco Digital de los Trabajadores',
  '0177 - Banco de la Fuerza Armada Nacional Bolivariana (BANFANB)',
  '0166 - Banco Agrícola de Venezuela',
] as const

export type BancoVenezuela = (typeof BANCOS_VENEZUELA)[number]
