# Fix 1: demo sin nombre ni género

**Qué pasaba:** la demo mostraba "Mariela" y "Bienvenida" (femenino), y "Invitada" como nombre por defecto.

**Qué se hizo:** nombre de ejemplo "Alex" (neutro), "Alex Rivera" en donante/vendedor/tarjeta demo, saludo "Hola" en Inicio y "Visita" como nombre de invitado. El id interno `d_mariela` pasó a `d_alex`. La etiqueta del paso del tour "Bienvenida" se dejó: es un sustantivo, no habla de la persona.

**Por qué:** no se preguntó pronombre; añadir ese dato exige columna y paso de onboarding. Si más adelante quieres personalizar el saludo, ahí sí hace falta.

**Decisión tuya:** si prefieres otro nombre de ejemplo, es un buscar y reemplazar de "Alex".
