import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

// Configuración recomendada de Next.js (reglas de React, hooks, accesibilidad básica y TypeScript).
const config = [
  ...nextVitals,
  ...nextTs,
  {
    // El código anterior a tener lint acumula estos casos por todo el proyecto
    // (docs/tanda-registro-pwa/fase-6-arreglos.md). Quedan como aviso para que
    // `npm run lint` pase y sirva con código nuevo; se corrigen poco a poco.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts", ".claude/**", "brag-output/**"],
  },
]

export default config
