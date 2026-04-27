import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let _authToken: string | null = null

export function setSupabaseToken(token: string | null): void {
  _authToken = token
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => {
      const headers = new Headers(options.headers)
      if (_authToken) {
        headers.set('Authorization', `Bearer ${_authToken}`)
      }
      return fetch(url, { ...options, headers })
    },
  },
})
