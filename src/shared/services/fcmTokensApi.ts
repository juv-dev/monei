import { neon } from '~/config/neon'

export interface FcmTokenRecord {
  id: string
  userId: string
  token: string
  platform: string
  createdAt: string
}

interface FcmTokenRow {
  id: string
  user_id: string
  token: string
  platform: string | null
  created_at: string
}

const TABLE = 'fcm_tokens'

function mapRow(row: FcmTokenRow): FcmTokenRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? ''),
    token: String(row.token ?? ''),
    platform: String(row.platform ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'web'
  const ua = navigator.userAgent.toLowerCase()
  if (/android/.test(ua)) return 'android'
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/windows/.test(ua)) return 'windows'
  if (/macintosh|mac os/.test(ua)) return 'macos'
  if (/linux/.test(ua)) return 'linux'
  return 'web'
}

export const fcmTokensApi = {
  async register(userId: string, token: string): Promise<void> {
    const existing = await neon.selectOne<FcmTokenRow>(TABLE, {
      token: `eq.${token}`,
    })
    if (existing) return
    await neon.insert<FcmTokenRow>(TABLE, {
      user_id: userId,
      token,
      platform: detectPlatform(),
    })
  },

  async unregister(userId: string, token: string): Promise<void> {
    await neon.remove(TABLE, { user_id: userId, token })
  },

  async listForUser(userId: string): Promise<FcmTokenRecord[]> {
    const rows = await neon.select<FcmTokenRow>(TABLE, {
      user_id: `eq.${userId}`,
    })
    return rows.map(mapRow)
  },
}
