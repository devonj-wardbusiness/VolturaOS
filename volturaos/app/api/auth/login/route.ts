import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // If invalid credentials, try signup
    if (error.message.includes('Invalid login')) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signUpError) {
        return Response.json({ error: signUpError.message }, { status: 400 })
      }
      // Sign in after signup
      const { error: retryError } = await supabase.auth.signInWithPassword({ email, password })
      if (retryError) {
        return Response.json({ error: retryError.message }, { status: 400 })
      }
    } else {
      return Response.json({ error: error.message }, { status: 400 })
    }
  }

  return Response.json({ ok: true })
}
