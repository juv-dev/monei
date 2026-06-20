import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fcmTokensApi } from '~/shared/services/fcmTokensApi'
import { neon } from '~/config/neon'

describe('should fcmTokensApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('should register', () => {
    it('should insert a new token when it does not exist', async () => {
      await fcmTokensApi.register('user-1', 'token-abc')
      const tokens = await fcmTokensApi.listForUser('user-1')
      expect(tokens).toHaveLength(1)
      expect(tokens[0].token).toBe('token-abc')
      expect(tokens[0].userId).toBe('user-1')
    })

    it('should not insert a duplicate token', async () => {
      await fcmTokensApi.register('user-1', 'token-abc')
      await fcmTokensApi.register('user-1', 'token-abc')
      const tokens = await fcmTokensApi.listForUser('user-1')
      expect(tokens).toHaveLength(1)
    })

    it('should set platform based on navigator userAgent', async () => {
      await fcmTokensApi.register('user-1', 'token-xyz')
      const tokens = await fcmTokensApi.listForUser('user-1')
      expect(typeof tokens[0].platform).toBe('string')
      expect(tokens[0].platform.length).toBeGreaterThan(0)
    })

    it('should detect android platform', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 12; Pixel 6)',
        configurable: true,
      })
      await fcmTokensApi.register('user-a', 'token-android')
      const tokens = await fcmTokensApi.listForUser('user-a')
      expect(tokens[0].platform).toBe('android')
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (linux)',
        configurable: true,
      })
    })

    it('should detect ios platform from iPhone userAgent', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
        configurable: true,
      })
      await fcmTokensApi.register('user-b', 'token-ios')
      const tokens = await fcmTokensApi.listForUser('user-b')
      expect(tokens[0].platform).toBe('ios')
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (linux)',
        configurable: true,
      })
    })

    it('should detect windows platform', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true,
      })
      await fcmTokensApi.register('user-c', 'token-win')
      const tokens = await fcmTokensApi.listForUser('user-c')
      expect(tokens[0].platform).toBe('windows')
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (linux)',
        configurable: true,
      })
    })

    it('should detect macos platform', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0)',
        configurable: true,
      })
      await fcmTokensApi.register('user-d', 'token-mac')
      const tokens = await fcmTokensApi.listForUser('user-d')
      expect(tokens[0].platform).toBe('macos')
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (linux)',
        configurable: true,
      })
    })
  })

  describe('should unregister', () => {
    it('should remove token from database', async () => {
      await fcmTokensApi.register('user-1', 'token-abc')
      await fcmTokensApi.unregister('user-1', 'token-abc')
      const tokens = await fcmTokensApi.listForUser('user-1')
      expect(tokens).toHaveLength(0)
    })

    it('should only remove the specified token', async () => {
      await fcmTokensApi.register('user-1', 'token-abc')
      await fcmTokensApi.register('user-1', 'token-xyz')
      await fcmTokensApi.unregister('user-1', 'token-abc')
      const tokens = await fcmTokensApi.listForUser('user-1')
      expect(tokens).toHaveLength(1)
      expect(tokens[0].token).toBe('token-xyz')
    })
  })

  describe('should listForUser', () => {
    it('should return empty array when user has no tokens', async () => {
      const tokens = await fcmTokensApi.listForUser('no-tokens-user')
      expect(tokens).toHaveLength(0)
    })

    it('should return all tokens for a user', async () => {
      await fcmTokensApi.register('user-2', 'token-1')
      await fcmTokensApi.register('user-2', 'token-2')
      const tokens = await fcmTokensApi.listForUser('user-2')
      expect(tokens).toHaveLength(2)
    })

    it('should map row fields to FcmTokenRecord shape', async () => {
      await fcmTokensApi.register('user-3', 'token-shaped')
      const tokens = await fcmTokensApi.listForUser('user-3')
      const record = tokens[0]
      expect(typeof record.id).toBe('string')
      expect(record.userId).toBe('user-3')
      expect(record.token).toBe('token-shaped')
      expect(typeof record.platform).toBe('string')
      expect(typeof record.createdAt).toBe('string')
    })

    it('should not return tokens belonging to other users', async () => {
      await fcmTokensApi.register('user-A', 'token-A')
      await fcmTokensApi.register('user-B', 'token-B')
      const tokens = await fcmTokensApi.listForUser('user-A')
      expect(tokens).toHaveLength(1)
      expect(tokens[0].userId).toBe('user-A')
    })

    it('should use empty string fallback for null token and platform in mapRow', async () => {
      await neon.insert('fcm_tokens', { user_id: 'user-nullfields', token: null, platform: null })
      const tokens = await fcmTokensApi.listForUser('user-nullfields')
      expect(tokens[0].token).toBe('')
      expect(tokens[0].platform).toBe('')
    })

    it('should use current date fallback for null created_at in mapRow', async () => {
      await neon.insert('fcm_tokens', {
        user_id: 'user-nodate',
        token: 'token-nodate',
        platform: 'web',
        created_at: null,
      })
      const tokens = await fcmTokensApi.listForUser('user-nodate')
      expect(typeof tokens[0].createdAt).toBe('string')
      expect(tokens[0].createdAt.length).toBeGreaterThan(0)
    })

    it('should use empty string fallback for null user_id in mapRow', async () => {
      await neon.insert('fcm_tokens', { user_id: null, token: 'orphan-token', platform: 'web' })
      const tokens = await fcmTokensApi.listForUser('')
      const orphan = tokens.find((t) => t.token === 'orphan-token')
      expect(orphan?.userId).toBe('')
    })
  })

  describe('should detectPlatform', () => {
    it('should detect linux platform from linux userAgent', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64)',
        configurable: true,
      })
      await fcmTokensApi.register('user-linux', 'token-linux')
      const tokens = await fcmTokensApi.listForUser('user-linux')
      expect(tokens[0].platform).toBe('linux')
    })

    it('should detect web platform for unknown userAgent', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'TestBrowser/1.0',
        configurable: true,
      })
      await fcmTokensApi.register('user-web', 'token-web')
      const tokens = await fcmTokensApi.listForUser('user-web')
      expect(tokens[0].platform).toBe('web')
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (linux)',
        configurable: true,
      })
    })
  })
})
