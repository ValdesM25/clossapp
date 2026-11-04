# Fix 5: cerrar sesión dejaba la PWA congelada en el logo

**Qué pasaba:** tras iniciar y cerrar sesión, la app se quedaba en el splash. `initializing` solo pasa a false al resolverse `getSession()` + la query a `perfiles`; ninguna tenía timeout, y `logout` limpiaba la UI solo después de `await signOut()`.

**Qué se hizo** (`hooks/use-auth.ts`)
- `conTimeout` (8 s) sobre `getSession`+`adopt` y sobre `signOut`; el `finally` ya existente quita el splash.
- `logout` limpia el estado de React antes de llamar a `signOut`.

**Por qué:** la causa más probable es un cuelgue del lock de supabase-js en la PWA (hipótesis, no reproducida). Con esto el peor caso es esperar 8 s y ver el login.

**Pendiente / decisión tuya:** probar en la PWA instalada (iniciar y cerrar sesión). Si sigue pasando, mirar devtools remotas por un service worker viejo. Si `signOut` expira, la sesión del servidor puede seguir válida hasta que reabras.
