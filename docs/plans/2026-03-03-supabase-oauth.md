# Supabase OAuth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded client-side auth with Supabase Auth supporting Google and Microsoft OAuth, while keeping a demo mode for portfolio reviewers.

**Architecture:** Supabase Auth handles OAuth flows (Google + Microsoft). The auth store wraps `@supabase/supabase-js` session management. LocalStorage data stays keyed by `user.id` (Supabase UUID). A "Demo mode" button allows instant access without OAuth for recruiters.

**Tech Stack:** `@supabase/supabase-js`, Supabase Auth (Google + Microsoft providers), Vue 3 + Pinia + TypeScript

---

## Prerequisites (User Action Required)

Before implementation, the user must:
1. Create a Supabase project at https://supabase.com
2. Enable Google OAuth provider (Settings → Authentication → Providers → Google)
3. Enable Azure/Microsoft OAuth provider (Settings → Authentication → Providers → Azure)
4. Provide `SUPABASE_URL` and `SUPABASE_ANON_KEY`

---

### Task 1: Install Supabase and Create Client Config

**Files:**
- Modify: `package.json`
- Create: `src/config/supabase.ts`
- Create: `.env.local` (gitignored)
- Modify: `.gitignore`
- Create: `env.d.ts` (update existing)

**Step 1: Install @supabase/supabase-js**

Run: `pnpm add @supabase/supabase-js`

**Step 2: Create environment file**

Create `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Step 3: Ensure .gitignore has .env.local**

Check `.gitignore` includes `.env.local` (Vite projects usually do).

**Step 4: Update env.d.ts with Vite env types**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**Step 5: Create Supabase client**

Create `src/config/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 6: Commit**

```bash
git add src/config/supabase.ts env.d.ts package.json pnpm-lock.yaml .gitignore
git commit -m "feat: add supabase client configuration"
```

---

### Task 2: Rewrite Auth Store for Supabase

**Files:**
- Modify: `src/stores/auth.ts`
- Modify: `src/shared/types/index.ts`

**Step 1: Update User type**

In `src/shared/types/index.ts`, update the User interface:
```typescript
export interface User {
  id: string           // Supabase UUID (or 'demo' for demo mode)
  username: string     // email
  displayName: string
  avatarUrl?: string   // from OAuth provider
  provider: 'google' | 'azure' | 'demo'
}
```

**Step 2: Rewrite auth store**

Replace `src/stores/auth.ts` with a Supabase-powered store:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '~/config/supabase'
import type { User } from '~/shared/types'
import type { Session } from '@supabase/supabase-js'

const DEMO_USER: User = {
  id: 'demo',
  username: 'demo@monei.app',
  displayName: 'Demo',
  provider: 'demo',
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(true)

  function mapSessionToUser(session: Session): User {
    const meta = session.user.user_metadata
    const provider = session.user.app_metadata.provider as 'google' | 'azure'
    return {
      id: session.user.id,
      username: session.user.email ?? '',
      displayName: meta.full_name ?? meta.name ?? session.user.email ?? '',
      avatarUrl: meta.avatar_url ?? meta.picture,
      provider,
    }
  }

  function setUser(u: User | null): void {
    user.value = u
    isAuthenticated.value = u !== null
  }

  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      // Check for demo session first
      const demoSession = sessionStorage.getItem('monei_demo_session')
      if (demoSession) {
        setUser(DEMO_USER)
        return
      }
      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(mapSessionToUser(session))
      }
    } finally {
      isLoading.value = false
    }
  }

  async function signInWithGoogle(): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) return { error: error.message }
    return {}
  }

  async function signInWithMicrosoft(): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: 'email profile openid',
      },
    })
    if (error) return { error: error.message }
    return {}
  }

  function signInAsDemo(): void {
    sessionStorage.setItem('monei_demo_session', '1')
    setUser(DEMO_USER)
  }

  async function logout(): Promise<void> {
    const wasDemo = user.value?.provider === 'demo'
    setUser(null)
    if (wasDemo) {
      sessionStorage.removeItem('monei_demo_session')
    } else {
      await supabase.auth.signOut()
    }
  }

  // Listen for auth state changes (OAuth redirect callback)
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      setUser(mapSessionToUser(session))
    } else if (user.value?.provider !== 'demo') {
      setUser(null)
    }
    isLoading.value = false
  })

  const currentUser = computed(() => user.value)
  const isLoggedIn = computed(() => isAuthenticated.value)
  const userId = computed(() => user.value?.id ?? '')

  return {
    user,
    isAuthenticated,
    isLoading,
    currentUser,
    isLoggedIn,
    userId,
    initialize,
    signInWithGoogle,
    signInWithMicrosoft,
    signInAsDemo,
    logout,
  }
})
```

**Key design decisions:**
- `userId` computed replaces hardcoded `user.username` as localStorage key prefix
- Demo mode uses `sessionStorage` (same pattern as before, just simplified)
- `onAuthStateChange` handles the OAuth redirect callback automatically
- `isLoading` prevents router guard flash while checking session
- Removed: `login()`, `checkAuth()`, `changePassword()`, `PREDEFINED_USERS`, password storage helpers, migration logic

**Step 3: Commit**

```bash
git add src/stores/auth.ts src/shared/types/index.ts
git commit -m "feat: rewrite auth store for supabase oauth + demo mode"
```

---

### Task 3: Update Data Composables for New userId

**Files:**
- Grep and update all composables that use `auth.user?.username` as storage key

All data composables (useIngresos, usePresupuesto, useDeudas, useTarjetas, useDashboard) need to change from `auth.user?.username` to `auth.userId` for localStorage keys.

**Step 1: Search for all username-as-key usages**

Run: `grep -rn "user?.username\|user.username\|user\.value\.username" src/modules/`

Update each composable's storage key from:
```typescript
const storageKey = `finance_${auth.user?.username}_ingresos`
```
to:
```typescript
const storageKey = `finance_${auth.userId}_ingresos`
```

**Step 2: Commit**

```bash
git add src/modules/
git commit -m "feat: use auth.userId for localStorage keys"
```

---

### Task 4: Redesign LoginView with OAuth Buttons

**Files:**
- Modify: `src/modules/auth/views/LoginView.vue`

**Step 1: Rewrite LoginView**

Replace the email/password form with OAuth buttons + demo access:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { ROUTE_NAMES } from '~/router'

const auth = useAuthStore()
const router = useRouter()
const error = ref<string | null>(null)
const isLoading = ref(false)

async function handleGoogle(): Promise<void> {
  error.value = null
  isLoading.value = true
  const result = await auth.signInWithGoogle()
  if (result.error) {
    error.value = result.error
    isLoading.value = false
  }
  // On success, page redirects to Google → back to app
}

async function handleMicrosoft(): Promise<void> {
  error.value = null
  isLoading.value = true
  const result = await auth.signInWithMicrosoft()
  if (result.error) {
    error.value = result.error
    isLoading.value = false
  }
}

function handleDemo(): void {
  auth.signInAsDemo()
  router.push({ name: ROUTE_NAMES.DASHBOARD })
}
</script>

<template>
  <div
    class="min-h-screen bg-[#F5F6FA] flex items-center justify-center p-4"
    data-testid="login-page"
  >
    <div class="w-full max-w-[380px]">
      <!-- Logo + tagline (unchanged) -->
      <div class="text-center mb-8">
        <svg class="w-12 h-12 mx-auto mb-4" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#B6A77A"/>
          <path d="M10 30 L16 18 L22 24 L28 12 L34 20" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="28" cy="12" r="2" fill="white"/>
        </svg>
        <h1 class="text-2xl font-bold text-[#1A1A2E]">Monei</h1>
        <p class="text-sm text-[#94A3B8] mt-1">Tu dinero, bajo control</p>
      </div>

      <div class="bg-white rounded-2xl border border-[#EEEEF0] p-8">
        <h2 class="text-base font-semibold text-[#1A1A2E] mb-6">Iniciar sesion</h2>

        <!-- Error -->
        <div
          v-if="error"
          class="flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-4"
          role="alert"
          data-testid="error-message"
        >
          <AlertCircle :size="15" class="shrink-0" />
          {{ error }}
        </div>

        <div class="space-y-3">
          <!-- Google OAuth -->
          <button
            type="button"
            :disabled="isLoading"
            class="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[#EEEEF0] rounded-xl text-sm font-medium text-[#1A1A2E] bg-white hover:bg-[#F5F6FA] transition-all disabled:opacity-50"
            data-testid="google-button"
            @click="handleGoogle"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <!-- Microsoft OAuth -->
          <button
            type="button"
            :disabled="isLoading"
            class="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[#EEEEF0] rounded-xl text-sm font-medium text-[#1A1A2E] bg-white hover:bg-[#F5F6FA] transition-all disabled:opacity-50"
            data-testid="microsoft-button"
            @click="handleMicrosoft"
          >
            <svg class="w-5 h-5" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Continuar con Outlook
          </button>
        </div>

        <!-- Divider -->
        <div class="flex items-center gap-3 my-6">
          <div class="flex-1 h-px bg-[#EEEEF0]"></div>
          <span class="text-xs text-[#94A3B8]">o</span>
          <div class="flex-1 h-px bg-[#EEEEF0]"></div>
        </div>

        <!-- Demo mode -->
        <div data-testid="credentials-hint">
          <button
            type="button"
            class="w-full py-2.5 px-4 bg-[#F5F6FA] hover:bg-[#EEEEF0] text-[#64748B] font-medium rounded-xl transition-all text-sm border border-[#EEEEF0]"
            data-testid="demo-button"
            @click="handleDemo"
          >
            Probar en modo demo
          </button>
          <p class="text-xs text-[#94A3B8] text-center mt-2">
            Accede sin crear cuenta — datos locales
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
```

**Step 2: Commit**

```bash
git add src/modules/auth/views/LoginView.vue
git commit -m "feat: redesign login with google, microsoft oauth + demo mode"
```

---

### Task 5: Update App.vue and Router Guard

**Files:**
- Modify: `src/App.vue`
- Modify: `src/router/index.ts`

**Step 1: Update App.vue initialization**

Replace `auth.checkAuth()` with `auth.initialize()`:
```typescript
onMounted(async () => {
  await auth.initialize()
})
```

**Step 2: Update router guard for async auth**

The guard needs to wait for `isLoading` to be false before deciding:
```typescript
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Wait for auth initialization to complete
  if (auth.isLoading) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(
        () => auth.isLoading,
        (loading) => {
          if (!loading) { unwatch(); resolve() }
        },
        { immediate: true },
      )
    })
  }

  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !auth.isLoggedIn) {
    return { name: ROUTE_NAMES.LOGIN }
  }

  if (to.name === ROUTE_NAMES.LOGIN && auth.isLoggedIn) {
    return { name: ROUTE_NAMES.DASHBOARD }
  }
})
```

Add `import { watch } from 'vue'` at the top of router file.

**Step 3: Commit**

```bash
git add src/App.vue src/router/index.ts
git commit -m "feat: update app init and router guard for supabase auth"
```

---

### Task 6: Update ConfiguracionView (Remove Password Change)

**Files:**
- Modify: `src/modules/configuracion/views/ConfiguracionView.vue`
- Modify: `src/modules/configuracion/composables/useConfiguracion.ts`

**Step 1: Replace password form with profile info + logout**

Since OAuth users don't manage passwords, replace the password change section with:
- User profile card (avatar from OAuth, name, email, provider badge)
- "Cerrar sesion" button
- Keep the same design system (white card, rounded-2xl, etc.)

Remove `changePassword` from the composable. The composable can expose user info and logout instead.

**Step 2: Commit**

```bash
git add src/modules/configuracion/
git commit -m "feat: replace password change with oauth profile in configuracion"
```

---

### Task 7: Update AppLayout for Avatar

**Files:**
- Modify: `src/shared/components/layout/AppLayout.vue`

**Step 1: Show user avatar in sidebar**

If `auth.currentUser?.avatarUrl` exists, show the OAuth avatar instead of the initial letter. Keep the initial letter as fallback (for demo mode).

```vue
<img
  v-if="auth.currentUser?.avatarUrl"
  :src="auth.currentUser.avatarUrl"
  :alt="auth.currentUser.displayName"
  class="w-8 h-8 rounded-full"
/>
<div v-else class="w-8 h-8 rounded-full bg-[#B6A77A]/15 flex items-center justify-center text-xs font-bold text-[#8A7050]">
  {{ auth.currentUser?.displayName.charAt(0).toUpperCase() }}
</div>
```

**Step 2: Commit**

```bash
git add src/shared/components/layout/AppLayout.vue
git commit -m "feat: show oauth avatar in sidebar"
```

---

### Task 8: Rewrite Auth Tests

**Files:**
- Modify: `test/stores/auth.spec.ts`
- Modify: `test/modules/auth/LoginView.spec.ts`
- Modify: `test/modules/configuracion/ConfiguracionView.spec.ts`
- Create: `test/helpers/supabase-mock.ts`

**Step 1: Create Supabase mock helper**

Create `test/helpers/supabase-mock.ts`:
```typescript
import { vi } from 'vitest'

export function createSupabaseMock() {
  const authStateCallbacks: Function[] = []

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn((callback: Function) => {
        authStateCallbacks.push(callback)
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
    },
    _triggerAuthChange: (event: string, session: any) => {
      authStateCallbacks.forEach(cb => cb(event, session))
    },
  }
}
```

Mock `~/config/supabase` in test setup:
```typescript
vi.mock('~/config/supabase', () => ({
  supabase: createSupabaseMock(),
}))
```

**Step 2: Rewrite auth store tests**

Test cases:
- Initial state (user null, not authenticated, isLoading true)
- `initialize()` with no session → stays unauthenticated
- `initialize()` with demo session in sessionStorage → sets demo user
- `initialize()` with existing Supabase session → maps session to user
- `signInWithGoogle()` calls supabase.auth.signInWithOAuth with provider 'google'
- `signInWithMicrosoft()` calls supabase.auth.signInWithOAuth with provider 'azure'
- `signInAsDemo()` sets demo user and sessionStorage flag
- `logout()` for demo user clears sessionStorage
- `logout()` for OAuth user calls supabase.auth.signOut
- `onAuthStateChange` updates user on session change
- `onAuthStateChange` with null session clears non-demo user
- `onAuthStateChange` with null session does NOT clear demo user
- `userId` computed returns user.id

**Step 3: Rewrite LoginView tests**

Test cases:
- Renders login page with Google, Microsoft, and Demo buttons
- Does NOT render email/password form
- Clicking Google button calls signInWithGoogle
- Clicking Microsoft button calls signInWithMicrosoft
- Clicking Demo button calls signInAsDemo and redirects to dashboard
- Shows error message when OAuth returns error
- Buttons disabled when loading

**Step 4: Rewrite ConfiguracionView tests**

Test cases matching the new profile-only view (no password change).

**Step 5: Commit**

```bash
git add test/
git commit -m "test: rewrite auth tests for supabase oauth + demo mode"
```

---

### Task 9: Run Full Test Suite and Fix Coverage

**Step 1: Run all tests**

Run: `pnpm test:coverage`
Expected: All 497+ tests pass, coverage thresholds met (95%+)

**Step 2: Fix any failures**

Likely areas needing fixes:
- Other test files that mock or reference old auth methods (`login()`, `checkAuth()`)
- Composable tests that use `auth.user?.username` for storage keys
- AppLayout tests if avatar logic changed template structure

**Step 3: Commit**

```bash
git add -A
git commit -m "test: fix all tests after supabase auth migration"
```

---

### Task 10: Verify Build

**Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify build passes with supabase auth"
```

---

## Data Migration Strategy

When existing users (jesusugazv@gmail.com, fiomagr@gmail.com) sign in via Google OAuth, their Supabase `user.id` (UUID) will be different from their old email-based localStorage keys. We need a one-time migration:

1. On first OAuth login, check if `finance_{email}_*` keys exist in localStorage
2. If yes, copy data to `finance_{supabase_uuid}_*` keys
3. Set a `migrated_{supabase_uuid}` flag to prevent re-migration

This can be added as a `migrateFromEmailKeys()` function in the auth store, called after `mapSessionToUser()`.

---

## Summary of Removed Code

- `PREDEFINED_USERS` constant and all hardcoded users
- `getStoredPassword()` and `setStoredPassword()` helpers
- `migrateUserData()` old username migration
- `login(username, password)` method
- `checkAuth()` method (replaced by `initialize()`)
- `changePassword()` method
- Password-related localStorage keys
- `useConfiguracion` composable's `changePassword` mutation
