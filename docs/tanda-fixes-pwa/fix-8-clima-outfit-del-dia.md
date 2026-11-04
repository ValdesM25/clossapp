# Fix 8: clima real y outfit del día en Inicio

**Qué pasaba:** Inicio mostraba "Soleado 24°C" fijo y las 3 primeras prendas del armario con título y descripción fijos.

**Qué se hizo**
- `services/clima.service.ts`: clima actual con Open-Meteo (gratis, sin API key) usando la ubicación del dispositivo. Si se niega el permiso o falla la red, no se muestra temperatura y todo sigue funcionando.
- `hooks/use-outfit-del-dia.ts`: un outfit por día y por usuario, guardado en localStorage (`outfit-dia:<userId>:<fecha>`).
  - Premium: lo genera la IA con el clima (`generateOutfits`), 1 llamada al día.
  - Plan gratis: se arma con reglas simples (top, bajo, zapatos y abrigo si hace frío o llueve), sin IA.
  - Si la IA falla, cae a las reglas.
- `inicio-view.tsx` usa el hook. La demo no pide ubicación y conserva sus datos de ejemplo.

**Por qué reglas en gratis:** el plan gratis permite 1 outfit de IA al día; generarlo solo al abrir Inicio dejaba el Simulador bloqueado. Fue tu decisión.

**Pendiente / ojo**
- Pide el permiso de ubicación del navegador al primer uso.
- El outfit se fija por día en ese dispositivo (otro dispositivo genera el suyo).
- "Vestir este outfit hoy" ahora registra el uso (`registrarUso` + `incrementarOutfits`, igual que el Simulador), una vez al día por dispositivo. En la demo solo es visual. Si falla el registro, el botón no se marca y se puede reintentar.
- Reglas por texto de categoría/nombre: prendas con categorías raras pueden no entrar al outfit simple.
