# 🎯 Instrucciones para Completar las Mejoras

## ✅ Lo que ya está implementado

### Backend (e:\DASHBOARD\backend\src\LegalController.php)
- ✅ Función `uploadPdf()` que analiza PDFs y cuenta folios
- ✅ Cálculo automático de precios (precio base: $1.50 USD por folio)
- ✅ Retorna estructura: `{ok, id, file_id, folios, pricing: {price_per_folio_usd, bcv_rate, iva_percent, unit_bs, subtotal_bs, iva_bs, total_bs}}`
- ✅ Sistema de estados en la base de datos

### Frontend Parcial (e:\DASHBOARD\frontend\src\pages\solicitante\Documento.tsx)
- ✅ Estados añadidos: `uploadingPdf`, `pdfAnalysis`
- ✅ Función `uploadPdfAnalysis` implementada
- ✅ Paso 2 con diseño moderno de carga de PDF
- ⚠️ **Paso 3 necesita actualización completa**

## 🔨 Lo que falta por hacer

### 1. Completar el Paso 3 del formulario cliente

Buscar en el archivo `e:\DASHBOARD\frontend\src\pages\solicitante\Documento.tsx` la línea que dice:
```tsx
{/* Paso 3 */}
```

Reemplazar toda la sección del Paso 3 (desde `{/* Paso 3 */}` hasta antes de `{showImg &&`) con el código moderno del archivo `MEJORAS_IMPLEMENTADAS.md` sección "Paso 3".

### 2. Actualizar la función `submitStep3`

Buscar la función `submitStep3` y asegurarse que envía todos los datos:
```typescript
const submitStep3 = async()=>{
  if(!req || !pdfAnalysis) return
  setLoading(true)
  try {
    await updateLegal(req.id, { 
      name: pay.name, 
      document: pay.document, 
      phone: pay.phone, 
      email: pay.email, 
      address: pay.address, 
      folios: pdfAnalysis.folios, 
      status:'Por verificar' 
    })
    await addLegalPayment(req.id, { 
      type: pay.type, 
      bank: pay.bank, 
      ref: pay.ref, 
      date: pay.date, 
      amount_bs: Number(pay.amount_bs || pdfAnalysis.total_bs), 
      status:'Pendiente', 
      mobile_phone: pay.type==='pago_movil'? pay.mobile_phone : undefined 
    })
    setLoading(false)
    alert('✅ Solicitud enviada correctamente. Será verificada por el administrador.')
    // Resetear formulario
    setStep(1)
    setReq(undefined)
    setFiles([])
    setMeta({})
    setAccept(false)
    setPdfAnalysis(null)
  } catch(err){
    setLoading(false)
    alert('Error al enviar la solicitud')
    console.error(err)
  }
}
```

### 3. Panel de Administrador - Vista de Publicaciones

Actualizar `e:\DASHBOARD\frontend\src\pages\Publicaciones.tsx`:

**Agregar filtros por estado:**
```tsx
const estadosOptions = ['Todos', 'Borrador', 'Por verificar', 'En trámite', 'Publicada', 'Rechazado']
```

**Agregar columna de acciones:**
- Botón "Ver Detalles" → Modal con toda la info
- Botón "Verificar Pago" → Marca como verificado
- Botón "Aprobar" → Cambia estado a "Publicada"
- Botón "Rechazar" → Cambia estado a "Rechazado"
- Dropdown "Cambiar Estado" → Permite cambio manual

**Modal de detalles debe mostrar:**
- Datos del documento (tipo de sociedad, trámite, etc.)
- Folios y precios
- PDF del documento (iframe o enlace de descarga)
- Datos personales del solicitante
- Información del pago
  - Tipo de pago
  - Banco
  - Referencia
  - Fecha
  - Monto
  - Teléfono (si pago móvil)
- Botones de acción (Aprobar/Rechazar/Cambiar estado)

### 4. Backend - Endpoint para cambiar estado

Agregar en `LegalController.php`:

```php
public function changeStatus($id){
  $pdo = Database::pdo();
  $u = AuthController::userFromToken(AuthController::bearerToken());
  if (!$u || ($u['role'] ?? '') !== 'admin') {
    return Response::json(['error'=>'forbidden'], 403);
  }
  
  $in = json_decode(file_get_contents('php://input'), true) ?: [];
  $status = $in['status'] ?? '';
  $validStatuses = ['Borrador','Por verificar','En trámite','Publicada','Rechazado'];
  
  if(!in_array($status, $validStatuses)){
    return Response::json(['error'=>'invalid_status'], 400);
  }
  
  $stmt = $pdo->prepare('UPDATE legal_requests SET status=?, updated_at=? WHERE id=?');
  $stmt->execute([$status, gmdate('c'), $id]);
  
  Response::json(['ok'=>true, 'status'=>$status]);
}
```

Registrar la ruta en `index.php`:
```php
if ($path === '/api/legal/'.$id.'/status' && $method === 'PUT') {
  return (new LegalController())->changeStatus($id);
}
```

### 5. Configuración de Precio

En `e:\DASHBOARD\frontend\src\pages\Configuracion.tsx`, agregar campo:

```tsx
<label className="block">
  <span className="text-sm font-medium">Precio por folio (USD)</span>
  <input 
    type="number" 
    step="0.01"
    className="input w-full" 
    value={s.price_per_folio_usd || 1.5} 
    onChange={e=>setS({...s, price_per_folio_usd: e.target.value})} 
  />
  <p className="text-xs text-slate-500 mt-1">Precio en dólares por cada página del documento</p>
</label>
```

## 📋 Checklist Final

- [ ] Completar Paso 3 con diseño moderno
- [ ] Actualizar función submitStep3
- [ ] Agregar filtros de estado en vista admin
- [ ] Crear modal de detalles de publicación
- [ ] Implementar botones de acción (Aprobar/Rechazar)
- [ ] Agregar endpoint changeStatus en backend
- [ ] Registrar ruta en index.php
- [ ] Añadir configuración de precio en admin
- [ ] Probar flujo completo: subir PDF → pagar → admin revisa → aprobar
- [ ] Verificar que los estados se actualicen correctamente
- [ ] Probar con diferentes tipos de documentos PDF

## 🎨 Paleta de Colores para Consistencia

```css
/* Brand/Vinotinto */
brand-50: #fff1f1
brand-100: #fee3e3
brand-600: #8f1920
brand-700: #6f0e15
brand-800: #520b11

/* Estados */
Borrador: bg-slate-200 text-slate-700
Por verificar: bg-amber-100 text-amber-800
En trámite: bg-blue-100 text-blue-800
Publicada: bg-green-100 text-green-800
Rechazado: bg-red-100 text-red-800
```

## 🚀 Orden de Implementación Recomendado

1. **Primero:** Completar Paso 3 del formulario cliente (más crítico)
2. **Segundo:** Backend changeStatus endpoint
3. **Tercero:** Modal de detalles en admin con acciones
4. **Cuarto:** Configuración de precio
5. **Quinto:** Testing completo del flujo

## 💡 Tips

- El diseño moderno usa cards con sombras: `shadow-md`
- Iconos SVG inline para mejor rendimiento
- Grid responsive: `grid md:grid-cols-2 gap-3`
- Transiciones suaves: `transition duration-200`
- Estados visuales claros con colores distintivos
- Validación de campos antes de habilitar botón de envío
