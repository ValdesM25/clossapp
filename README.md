# ClossApp — Armario Inteligente & Marketplace

> **Proyecto Integrador · Plan de Negocios**  
> Gestión Empresarial · Instituto Tecnológico de Saltillo (ITS)  
> Materia: Plan de Negocios

---

## ¿Qué es ClossApp?

ClossApp es una plataforma SaaS móvil-first que convierte el armario físico de una persona en un inventario digital inteligente. Mediante visión artificial, organiza automáticamente cada prenda, sugiere outfits personalizados y habilita un ecosistema de compra-venta y renta entre usuarios — todo desde el teléfono, sin entrada manual de datos.

---

## 1. El Problema

> *"Tengo ropa y no sé qué ponerme."*

Este es uno de los problemas cotidianos más universales entre mujeres de 18 a 40 años, y tiene un costo real:

- **Tiempo perdido** eligiendo outfits cada mañana.
- **Dinero desperdiciado** en prendas que se compran y nunca se usan.
- **Oportunidad de ingreso desaprovechada**: vestidos de noche y accesorios de lujo que duermen en el clóset y podrían generar dinero.
- **Fricción de adopción tecnológica**: las apps existentes requieren que el usuario etiquete, categorice y describa cada prenda manualmente — nadie lo hace.

---

## 2. La Solución

ClossApp elimina la fricción con un flujo de tres pasos:

```mermaid
flowchart LR
    A["📸 Usuario toma foto"] --> B["🤖 Claude analiza imagen"]
    B --> C["📋 JSON estructurado\nnombre · categoría · color · estilo"]
    C --> D["✅ Prenda lista\nen el armario digital"]

    style A fill:#18181b,color:#fff,stroke:none
    style B fill:#3f3f46,color:#fff,stroke:none
    style C fill:#3f3f46,color:#fff,stroke:none
    style D fill:#18181b,color:#fff,stroke:none
```

**Cero formularios. Cero etiquetas manuales.**

---

## 3. Propuesta de Valor

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#18181b", "primaryTextColor": "#fff", "primaryBorderColor": "#3f3f46", "lineColor": "#71717a", "secondaryColor": "#3f3f46", "tertiaryColor": "#f4f4f5"}}}%%
quadrantChart
    title Posicionamiento vs Competencia
    x-axis "Baja Automatización" --> "Alta Automatización"
    y-axis "Sin Monetización" --> "Monetización Integrada"
    quadrant-1 Ideal
    quadrant-2 Potencial sin ingresos
    quadrant-3 Obsoleto
    quadrant-4 Ingresos sin tech
    ClossApp: [0.85, 0.90]
    Stylebook: [0.45, 0.20]
    Vinted: [0.30, 0.75]
    Closet+: [0.50, 0.30]
    Excel/Papel: [0.05, 0.10]
```

| Dimensión | Modelo Tradicional | ClossApp |
|---|---|---|
| Organización del armario | Manual, en papel o memoria | Digital, automática con IA |
| Sugerencias de outfit | Amiga, revista, intuición | Motor de IA personalizado por clima y ocasión |
| Monetización de prendas | Venta en grupos de Facebook | Marketplace integrado con flujo de compra y renta |
| Entrada de datos | El usuario escribe todo | La IA lo hace por ti (foto → JSON) |
| Acceso | Ninguno / apps genéricas | App móvil nativa (iOS-first) |

---

## 4. Modelo de Negocio

ClossApp opera bajo un modelo **SaaS híbrido con tres fuentes de ingreso**:

### 4.1 Fuentes de Ingreso

```mermaid
pie title Composición de Ingresos Proyectados (Año 1)
    "Suscripciones Plus/Elite" : 530000
    "Comisiones Marketplace" : 80000
    "Comisiones Renta" : 40000
```

### 4.2 Planes de Suscripción

```mermaid
%%{init: {"theme": "base"}}%%
block-beta
  columns 3
  block:esencial["🆓 Esencial\n$0 MXN/mes"]:1
    e1["Hasta 50 prendas"]
    e2["Marketplace básico"]
    e3["Sin IA"]
  end
  block:plus["⭐ Plus\n$59 MXN/mes"]:1
    p1["Prendas ilimitadas"]
    p2["IA ilimitada"]
    p3["Estadísticas avanzadas"]
  end
  block:elite["💎 Elite\n$89 MXN/mes"]:1
    el1["Todo lo de Plus"]
    el2["Reportes de tendencias"]
    el3["Soporte prioritario"]
  end
```

### 4.3 Comisiones por Transacción

- **Venta entre usuarios**: comisión del 8–12% sobre cada transacción completada en el Marketplace.
- **Renta de prendas**: comisión del 15% sobre cada renta confirmada (vestidos de noche y accesorios).

### 4.4 Reglas de Negocio Estrictas — Validación de Renta

```mermaid
flowchart TD
    A["Usuario intenta publicar\nprenda para renta"] --> B{¿Categoría permitida?}
    B -->|"✅ Vestido / Accesorio"| C["Formulario de precio\nhabilitado"]
    B -->|"❌ Calzado / Pantalón\nBlusa / Ropa interior"| D["UI bloqueada\ntooltip explicativo"]
    C --> E["POST /api/renta\nValidación backend"]
    E --> F{¿Categoría válida\nen DB?}
    F -->|"✅ OK"| G["en_renta = true\nPublicada en feed"]
    F -->|"❌ Rechazado"| H["HTTP 400\nError al cliente"]
    D --> I["Sin llamada\nal servidor"]

    style D fill:#ef4444,color:#fff,stroke:none
    style H fill:#ef4444,color:#fff,stroke:none
    style G fill:#22c55e,color:#fff,stroke:none
    style I fill:#71717a,color:#fff,stroke:none
```

---

## 5. Arquitectura Técnica

### Stack y Flujo de Datos

```mermaid
graph TB
    subgraph CLIENT["📱 Cliente (iOS Mobile)"]
        UI["Next.js · React 19\nTailwind · Framer Motion"]
        CANVAS["Canvas API\nCompresión de imágenes"]
    end

    subgraph SERVER["⚡ Servidor (Serverless)"]
        API1["/api/analyze-prenda\nClaude Sonnet"]
        API2["/api/generate-outfits\nClaude Haiku"]
        API3["/api/recommend\nClaude Sonnet"]
        API4["/api/renta\nValidación categoría"]
        GUARD["🛡️ Guest Guard\nRBAC · user_id check"]
    end

    subgraph DB["🗄️ Supabase"]
        PG["PostgreSQL\nprendas · reparaciones\nusuarios_permitidos"]
        STORAGE["Storage\ncloset-images bucket"]
    end

    subgraph AI["🤖 Anthropic API"]
        SONNET["Claude Sonnet\nVisión · Análisis"]
        HAIKU["Claude Haiku\nCombinatorias · Outfits"]
    end

    UI --> CANVAS
    CANVAS -->|"~200KB JPEG"| STORAGE
    UI --> GUARD
    GUARD -->|"user_id válido"| API1
    GUARD -->|"user_id válido"| API2
    GUARD -->|"guest → 403"| SERVER
    API1 --> SONNET
    API2 --> HAIKU
    API3 --> SONNET
    API1 --> PG
    API4 --> PG
    UI --> PG

    style CLIENT fill:#18181b,color:#fff,stroke:#3f3f46
    style SERVER fill:#1e1e2e,color:#fff,stroke:#3f3f46
    style DB fill:#1a1a2e,color:#fff,stroke:#3f3f46
    style AI fill:#0f172a,color:#fff,stroke:#3f3f46
```

### Endpoints de IA

| Endpoint | Modelo | Función |
|---|---|---|
| `/api/analyze-prenda` | Claude Sonnet | Analiza imagen → JSON con nombre, categoría, color, estilo |
| `/api/generate-outfits` | Claude Haiku | 3 propuestas de outfit con `prenda_ids` del inventario real |
| `/api/recommend` | Claude Sonnet | Recomendaciones contextuales por clima y ocasión |
| `/api/renta` | — | Valida categoría y publica prenda para renta |

---

## 6. Optimización de Costos de Infraestructura

### 6.1 Compresión de Imágenes en el Cliente

```mermaid
flowchart LR
    A["📷 Foto original\n3–8 MB"] -->|"Canvas API\nresize 1000px\nJPEG 85%"| B["🗜️ Imagen comprimida\n150–300 KB"]
    B -->|"Upload"| C["☁️ Supabase Storage"]

    A2["Sin compresión\n100 fotos = ~500 MB"] -.->|"vs"| B2["Con compresión\n100 fotos = ~25 MB"]

    style A fill:#ef4444,color:#fff,stroke:none
    style B fill:#22c55e,color:#fff,stroke:none
    style C fill:#3b82f6,color:#fff,stroke:none
    style A2 fill:#fca5a5,color:#18181b,stroke:none
    style B2 fill:#86efac,color:#18181b,stroke:none
```

**Resultado:** Reducción del 90–95% en almacenamiento. Transferencia 10x menor por subida.

### 6.2 Guest Guard — RBAC para la API de IA

```mermaid
sequenceDiagram
    actor G as 👤 Invitada
    actor V as 🔑 Usuario VIP
    participant FE as Frontend
    participant API as API Route
    participant AI as Anthropic

    G->>FE: Clic "Generar Propuestas"
    FE-->>G: Botón deshabilitado\n"Inicia sesión para usar IA"
    Note over G,FE: Cero llamadas al servidor

    V->>FE: Clic "Generar Propuestas"
    FE->>API: POST /api/generate-outfits\n{ user_id: "sofia" }
    API->>API: Validar user_id != "guest"
    API->>AI: Llamada a Claude Haiku
    AI-->>API: 3 outfits JSON
    API-->>FE: Respuesta 200
    FE-->>V: Propuestas renderizadas
```

---

## 7. Esquema de Base de Datos

```mermaid
erDiagram
    usuarios_permitidos {
        text username PK
        int outfits_creados
    }

    prendas {
        uuid id PK
        text user_id FK
        text name
        text category
        text image_url
        text talla
        text estado_uso
        numeric precio
        numeric precio_renta
        boolean en_venta
        boolean en_renta
        date fecha_renta
        int usos
        timestamp ultimo_uso
        jsonb metadata
        timestamp created_at
    }

    reparaciones {
        uuid id PK
        text user_id FK
        uuid prenda_id FK
        text tarea
        text prioridad
        boolean completado
        timestamp created_at
    }

    usuarios_permitidos ||--o{ prendas : "posee"
    usuarios_permitidos ||--o{ reparaciones : "registra"
    prendas ||--o{ reparaciones : "tiene"
```

---

## 8. Flujo Completo del Usuario

```mermaid
journey
    title Día típico de una usuaria ClossApp
    section Mañana
      Abre la app: 5: Usuaria
      Ve sugerencia de outfit del día: 5: Usuaria, IA
      Elige outfit y registra uso: 4: Usuaria
    section Tarde
      Sube nueva prenda con foto: 5: Usuaria
      IA etiqueta automáticamente: 5: IA
      Revisa armario actualizado: 4: Usuaria
    section Noche
      Publica vestido para renta: 4: Usuaria
      Recibe solicitud de renta: 5: Usuaria, Marketplace
      Confirma fecha y genera ingreso: 5: Usuaria
```

---

## 9. Análisis de Mercado

```mermaid
%%{init: {"theme": "base"}}%%
xychart-beta
    title "Mercado Potencial México (millones de usuarias)"
    x-axis ["Total segmento\n18-40 años", "Con smartphone", "Interés en moda", "Early adopters\n(Año 1 meta)"]
    y-axis "Millones" 0 --> 30
    bar [25, 20, 8, 0.005]
```

### Ventaja Competitiva

- **Ningún competidor directo en México** combina armario digital + IA + marketplace de renta en una sola app.
- La barrera de entrada es la integración de IA con el inventario personal — costosa de replicar.
- El efecto de red del Marketplace crea un moat defensible a medida que crece la base de usuarios.

---

## 10. Proyección Financiera (Año 1)

```mermaid
%%{init: {"theme": "base"}}%%
xychart-beta
    title "Proyección de Ingresos vs Costos Año 1 (MXN)"
    x-axis ["Suscripciones", "Comisiones\nMarketplace", "Comisiones\nRenta", "API Anthropic", "Supabase Pro"]
    y-axis "MXN" 0 --> 600000
    bar [530000, 80000, 40000, 18000, 7200]
```

| Métrica | Meta Año 1 |
|---|---|
| Usuarios registrados | 5,000 |
| Conversión a Plan Plus/Elite | 15% → 750 usuarios |
| Ingreso por suscripciones | ~$530,000 MXN |
| Comisiones Marketplace + Renta | ~$120,000 MXN |
| **Ingreso Total Proyectado** | **~$650,000 MXN** |
| Costo API Anthropic | ~$18,000 MXN |
| Costo Supabase Pro | ~$7,200 MXN |
| **Margen Bruto Estimado** | **~95%** |

> *El margen bruto es excepcionalmente alto porque el costo marginal de servir a un usuario adicional es casi cero — característica definitoria de un negocio SaaS bien construido.*

---

## 11. Estado Actual (Fase MVP) y Roadmap

ClossApp se encuentra actualmente en fase **MVP (Producto Mínimo Viable)** para un grupo de pruebas cerrado (Closed Beta). Para priorizar la validación de las hipótesis más riesgosas del negocio (Auto-etiquetado con IA y Marketplace), algunas funciones periféricas están simuladas temporalmente:

* **Autenticación (Auth):** Actualmente el sistema utiliza un "Mock Login" (asignación directa de `user_id` en el estado de la app) para agilizar el onboarding de las usuarias fundadoras. 
* **Pasarela de Pagos:** Las rentas y ventas se acuerdan dentro de la plataforma, pero la transacción monetaria se procesa fuera de banda.

### 🚀 Roadmap (Próximas Fases)
1. **Fase 2:** Integración de Supabase Auth (Email/Password y OAuth) para el registro abierto.
2. **Fase 3:** Integración de Stripe para procesar los cobros de renta nativamente y automatizar la retención de comisiones.
3. **Fase 4:** Migración de almacenamiento de imágenes a un CDN global para reducir latencia en el feed del Marketplace.

---

## 12. Instalación y Desarrollo Local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/clossapp.git
cd clossapp

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus keys de Supabase y Anthropic

# Ejecutar en desarrollo
npm run dev
```

### Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

---

## 13. Equipo

Desarrollado como Proyecto Integrador para la materia **Plan de Negocios**  
**Gestión Empresarial · Instituto Tecnológico de Saltillo (ITS)**

---

## 14. Licencia y Derechos de Autor

**© 2026 Mauricio González. Todos los derechos reservados.**

Este repositorio es público exclusivamente con fines de exhibición para portafolio profesional y como Caso de Estudio académico para el Instituto Tecnológico de Saltillo. 

Eres bienvenido a explorar el código para aprender de la arquitectura Serverless o la implementación de IA generativa. Sin embargo, este proyecto **no es de código abierto (Open Source)**. No se permite la copia, distribución, modificación, clonación para proyectos derivados, ni el uso comercial de este software sin autorización expresa.

<div align="center">

**ClossApp · ITS Saltillo · 2026**

</div>
