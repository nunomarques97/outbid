import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  isConfigured: boolean
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const NOT_CONFIGURED_MESSAGE =
  'Outbid isn’t connected to Supabase yet — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable accounts.'

export const AuthContext = createContext<AuthContextValue | null>(null)
