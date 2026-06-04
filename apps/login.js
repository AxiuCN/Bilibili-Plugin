import { doLogin, createClient } from '../components/Claimer.js'
import { loadCookies } from '../components/Storage.js'

let loginInProgress = false

export class BiliLogin extends plugin {
  constructor() {
    super({
      name: '[B站账号]',
      dsc: 'B站账号登录与状态管理',
      event: 'message',
      priority: 500,
      rule: [
        { reg: '^#B站登录$', fnc: 'cmdLogin' },
        { reg: '^#B站状态$', fnc: 'cmdStatus' },
      ],
    })
  }

  /**
   * #B站登录 — 扫码登录B站
   */
  async cmdLogin(e) {
    if (loginInProgress) {
      return e.reply('[B站账号] 已有登录流程正在进行中，请稍后重试')
    }
    loginInProgress = true

    try {
      await e.reply('[B站账号] 正在生成登录二维码...')

      await doLogin({
        onQR: async (url) => {
          const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`
          await e.reply([
            segment.image(qrImg),
            '\n[B站账号] 请使用B站客户端扫码登录（3分钟内有效）',
          ])
        },
        onStatus: async (msg) => {
          await e.reply(`[B站账号] ${msg}`)
        },
      })

      await e.reply('[B站账号] 登录成功，Cookie 已保存')
    } catch (err) {
      await e.reply(`[B站账号] ${err.message}`)
    } finally {
      loginInProgress = false
    }
  }

  /**
   * #B站状态 — 查看登录态
   */
  async cmdStatus(e) {
    const cookies = loadCookies()
    if (!cookies) {
      return e.reply('[B站账号] 未登录，请发送 #B站登录')
    }

    try {
      const client = await createClient()
      if (client) {
        await client.ensureLoggedIn()
        return e.reply('[B站账号] 登录状态: 有效 ✓')
      }
    } catch {
      // 登录失效
    }
    e.reply('[B站账号] 登录已过期，请重新发送 #B站登录')
  }
}
