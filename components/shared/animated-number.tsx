"use client"

import { useState, useEffect } from "react"
import { useMotionValue, useSpring } from "framer-motion"

export function AnimatedNumber({ target }: { target: number }) {
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 })
  const [display, setDisplay] = useState(0)
  useEffect(() => { motionVal.set(target) }, [target, motionVal])
  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring])
  return <>{display}</>
}
