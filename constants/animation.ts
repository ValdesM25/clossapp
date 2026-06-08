import type { Variants } from "framer-motion"

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
}

export const pageProps = { variants: pageVariants, initial: "initial" as const, animate: "animate" as const, exit: "exit" as const }
