// Demo mode: hardcoded user — no login flow needed
export const DEMO_USER = {
  id: "demo-user-123",
  name: "Sofia",
} as const

export function useAuth() {
  return { user: DEMO_USER }
}
