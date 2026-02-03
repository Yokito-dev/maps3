'use client'

import { AuthProvider } from "./context/AuthContext"
import { ScheduleProvider } from "./context/ScheduleContext"

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ScheduleProvider>
        {children}
      </ScheduleProvider>
    </AuthProvider>
  )
}
