import { BrowserRouter } from 'react-router-dom'
import type { PropsWithChildren } from 'react'

export function AppRouter({ children }: PropsWithChildren) {
  return <BrowserRouter>{children}</BrowserRouter>
}
