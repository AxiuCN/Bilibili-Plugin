import fetch from 'node-fetch'
import {
  QRCODE_GENERATE_URL,
  QRCODE_POLL_URL,
  DEFAULT_USER_AGENT,
  LOGIN_POLL_TIMEOUT_SECONDS,
  LOGIN_POLL_INTERVAL_SECONDS,
} from './constants.js'

/**
 * 从 fetch Response 中提取 set-cookie 并合并到 cookies 对象
 */
function mergeCookies(cookies, response) {
  // 兼容 node-fetch v2 (raw) 和 v3 (getSetCookie)
  let values = []
  if (typeof response.headers.getSetCookie === 'function') {
    values = response.headers.getSetCookie()
  } else if (typeof response.headers.raw === 'function') {
    values = response.headers.raw()['set-cookie'] || []
  } else {
    const v = response.headers.get('set-cookie')
    if (v) values = [v]
  }
  for (const header of values) {
    const match = header.match(/^([^=]+)=([^;]+)/)
    if (match) {
      cookies[match[1]] = match[2]
    }
  }
}

/**
 * 发起扫码登录流程，返回 cookies
 * @param {object} opts
 * @param {Function} [opts.onQR] — 收到二维码 url 后的回调，用于发送给用户
 * @param {Function} [opts.onStatus] — 状态变更回调 (msg)
 * @param {object} [opts.cancelSignal] — { cancelled: boolean }
 * @returns {Promise<object>} cookies
 */
async function startLogin(opts = {}) {
  const { onQR, onStatus, cancelSignal } = opts

  // Step 1: 获取二维码
  const genRes = await fetch(QRCODE_GENERATE_URL, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Referer: 'https://www.bilibili.com/',
    },
  })
  const genPayload = await genRes.json()
  if (genPayload?.code !== 0) {
    throw new Error(`获取登录二维码失败: code=${genPayload?.code}`)
  }

  const data = genPayload?.data || {}
  const url = data.url
  const qrcodeKey = data.qrcode_key
  if (!url || !qrcodeKey) {
    throw new Error('登录二维码返回内容不完整')
  }

  // 从 generate 响应中提取初始 cookies
  const cookies = {}
  mergeCookies(cookies, genRes)

  if (onQR) onQR(url)

  // Step 2: 轮询扫码结果
  const deadline = Date.now() + LOGIN_POLL_TIMEOUT_SECONDS * 1000
  let lastStatus = null

  while (Date.now() < deadline) {
    if (cancelSignal?.cancelled) {
      throw new Error('[登录] 已取消')
    }

    const pollRes = await fetch(`${QRCODE_POLL_URL}?qrcode_key=${qrcodeKey}`, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Referer: 'https://www.bilibili.com/',
        Cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
      },
    })
    const pollPayload = await pollRes.json()
    const pollData = pollPayload?.data || {}
    const code = pollData.code

    // 每次轮询都可能更新 cookie
    mergeCookies(cookies, pollRes)

    if (code !== lastStatus) {
      lastStatus = code
      const msgs = {
        86101: '[登录] 等待扫码...',
        86090: '[登录] 已扫码，请确认登录',
        86038: null,
        0: '[登录] 扫码登录成功',
      }
      const msg = msgs[code]
      if (msg && onStatus) onStatus(msg)
      if (code === 86038) {
        throw new Error('[登录] 二维码已过期，请重新发送 #激励登录')
      }
    }

    if (code === 0) {
      // 从 poll 响应的跨域重定向 url 中提取额外 cookies
      if (pollData.url) {
        // url 的 query 中可能含 SESSDATA 等
        const redirectUrl = new URL(pollData.url)
        redirectUrl.searchParams.forEach((value, key) => {
          if (!cookies[key]) cookies[key] = value
        })
      }
      return cookies
    }

    await new Promise(r => setTimeout(r, LOGIN_POLL_INTERVAL_SECONDS * 1000))
  }

  throw new Error('[登录] 扫码超时，请重新发送 #激励登录')
}

export { startLogin }
