'use server'

import { createClient } from '@/lib/supabase/server'

export async function signInWithPassword(email: string, password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login')) {
      // Create account first
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) return { error: signUpError.message }

      // Try login again
      const { error: retryError } = await supabase.auth.signInWithPassword({ email, password })
      if (retryError) return { error: retryError.message }
    } else {
      return { error: error.message }
    }
  }

  return { error: null }
}
