"use client"

import { useState, useEffect } from "react"
import { useMotionValue, useSpring } from "framer-motion"

interface AnimatedNumberProps {
  target: number
  /** Cómo mostrar el valor ya redondeado (ej. moneda). Por defecto, el entero tal cual. */
  format?: (n: number) => string
}

export function AnimatedNumber({ target, format }: AnimatedNumberProps) {
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 })
  const [display, setDisplay] = useState(0)
  useEffect(() => { motionVal.set(target) }, [target, motionVal])
  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring])
  return <>{format ? format(display) : display}</>
}
