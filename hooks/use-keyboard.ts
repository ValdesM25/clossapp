"use client"

import { useState, useEffect } from "react"

export function useKeyboard() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const handler = () => setOpen(vv.height < window.innerHeight * 0.75)
    vv.addEventListener("resize", handler)
    return () => vv.removeEventListener("resize", handler)
  }, [])
  return open
}
