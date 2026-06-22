import fs from 'node:fs'
import path from 'node:path'
import crypto from 'crypto'
import fetch from 'node-fetch'
import {
  NAV_URL,
  QRCODE_GENERATE_URL,
  QRCODE_POLL_URL,
  DEFAULT_USER_AGENT,
  LOGIN_POLL_TIMEOUT_SECONDS,
  LOGIN_POLL_INTERVAL_SECONDS,
  MIXIN_KEY_ENC_TAB,
  botAccountsDir,
  accountsDir,
} from '../../components/constants.js'

// ========== Cookie 管理 ==========

/**
 * 校验 Cookie 是否包含必要字段
 * @param {object|null} cookies
 * @returns {boolean}
 */
function validateCookies(cookies) {
  return !!(cookies && typeof cookies === 'object' && cookies.SESSDATA && cookies.bili_jct)
}

/**
 * 加载机器人公共账号 Cookie
 * 路径: data/bot_accounts/bilibili.json
 * @returns {object|null} cookies 对象
 */
function loadBotCookies() {
  try {
    const dir = botAccountsDir
    if (!fs.existsSync(dir)) return null
    const file = path.join(dir, 'bilibili.json')
    if (!fs.existsSync(file)) return null
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'))
    const cookies = payload?.cookies
    return validateCookies(cookies) ? cookies : null
  } catch {
    return null
  }
}

/**
 * 保存机器人公共账号 Cookie
 * @param {object} cookies
 */
function saveBotCookies(cookies) {
  if (!validateCookies(cookies)) {
    throw new Error('[BotAccount] Cookie 缺少关键字段: SESSDATA 或 bili_jct')
  }
  fs.mkdirSync(botAccountsDir, { recursive: true })
  fs.writeFileSync(
    path.join(botAccountsDir, 'bilibili.json'),
    JSON.stringify({ saved_at: new Date().toLocaleString('zh-CN', { hour12: false }), cookies }, null, 2),
    'utf8',
  )
}

/**
 * 加载指定 QQ 的个人 Cookie
 * 路径: data/accounts/<qq>.json
 * @param {string|number} qq
 * @returns {object|null}
 */
function loadAccountCookies(qq) {
  try {
    const file = path.join(accountsDir, `${qq}.json`)
    if (!fs.existsSync(file)) return null
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'))
    const cookies = payload?.cookies
    return validateCookies(cookies) ? cookies : null
  } catch {
    return null
  }
}

/**
 * 保存指定 QQ 的个人 Cookie
 * @param {string|number} qq
 * @param {object} cookies
 */
function saveAccountCookies(qq, cookies) {
  if (!validateCookies(cookies)) {
    throw new Error('[Account] Cookie 缺少关键字段: SESSDATA 或 bili_jct')
  }
  fs.mkdirSync(accountsDir, { recursive: true })
  fs.writeFileSync(
    path.join(accountsDir, `${qq}.json`),
    JSON.stringify({ saved_at: new Date().toLocaleString('zh-CN', { hour12: false }), cookies }, null, 2),
    'utf8',
  )
}

/**
 * 列出所有已绑定个人 Cookie 的 QQ
 * @returns {string[]}
 */
function listBoundAccounts() {
  try {
    if (!fs.existsSync(accountsDir)) return []
    return fs.readdirSync(accountsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
  } catch {
    return []
  }
}

// ========== QR 扫码登录 ==========

/**
 * 从 fetch Response 中提取 set-cookie 到 cookies 对象
 */
function mergeCookies(cookies, response) {
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
    if (match) cookies[match[1]] = match[2]
  }
}

/**
 * 发起扫码登录流程
 * @param {object} [opts]
 * @param {Function} [opts.onQR] - 收到二维码 url 的回调
 * @returns {Promise<object>} cookies
 */
async function startLogin(opts = {}) {
  const timeout = (opts.timeout || LOGIN_POLL_TIMEOUT_SECONDS) * 1000

  // Step 1: 获取二维码
  const genRes = await fetch(QRCODE_GENERATE_URL, {
    headers: { 'User-Agent': DEFAULT_USER_AGENT, Referer: 'https://www.bilibili.com/' },
  })
  const genPayload = await genRes.json()
  if (genPayload?.code !== 0) {
    throw new Error(`获取登录二维码失败: ${genPayload?.message || genPayload?.code}`)
  }
  const data = genPayload?.data || {}
  const url = data.url
  const qrcodeKey = data.qrcode_key
  if (!url || !qrcodeKey) throw new Error('登录二维码返回内容不完整')

  const cookies = {}
  mergeCookies(cookies, genRes)

  if (opts.onQR) await opts.onQR(url)

  // Step 2: 静默轮询
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
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
    mergeCookies(cookies, pollRes)

    if (code === 0) {
      if (pollData.url) {
        const qs = new URL(pollData.url)
        qs.searchParams.forEach((v, k) => { if (!cookies[k]) cookies[k] = v })
      }
      if (!cookies.bili_jct && cookies.DedeUserID) {
        cookies.bili_jct = cookies.bili_jct || crypto.createHash('md5').update(cookies.DedeUserID).digest('hex')
      }
      return cookies
    }
    if (code === 86038) {
      throw new Error('二维码已过期，请重新发送登录指令')
    }

    await new Promise(r => setTimeout(r, LOGIN_POLL_INTERVAL_SECONDS * 1000))
  }

  throw new Error('扫码登录超时，请重新发送登录指令')
}

// ========== WBI 签名 ==========

/** 缓存 WBI 密钥对 (img_key, sub_key) */
let _wbiKeysCache = null
let _wbiKeysExpire = 0

/**
 * 获取 WBI 密钥对
 * @param {object|null} [cookies] - 可选的 cookie 对象，用于带登录态请求
 * @returns {Promise<{img_key: string, sub_key: string}>}
 */
async function getWbiKeys(cookies = null) {
  if (_wbiKeysCache && Date.now() < _wbiKeysExpire) return _wbiKeysCache

  const headers = { 'User-Agent': DEFAULT_USER_AGENT, Referer: 'https://www.bilibili.com/' }
  if (cookies) {
    headers.Cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
  }

  const res = await fetch(NAV_URL, { headers })
  const payload = await res.json()
  const wbiImg = payload?.data?.wbi_img || {}
  const imgUrl = wbiImg.img_url
  const subUrl = wbiImg.sub_url
  if (!imgUrl || !subUrl) {
    throw new Error('获取 WBI 密钥失败')
  }
  _wbiKeysCache = {
    img_key: imgUrl.split('/').pop().split('.')[0],
    sub_key: subUrl.split('/').pop().split('.')[0],
  }
  // 缓存至次日 0 点
  const now = new Date()
  _wbiKeysExpire = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  return _wbiKeysCache
}

/**
 * 对参数做 WBI 签名，返回查询串
 * @param {object} params - 待签名参数
 * @param {object|null} [cookies] - 可选的 cookie
 * @returns {Promise<string>} 含 w_rid + wts 的查询串
 */
async function signWbi(params = {}, cookies = null) {
  const { img_key, sub_key } = await getWbiKeys(cookies)
  const mixinSource = img_key + sub_key
  const mixinKey = MIXIN_KEY_ENC_TAB.map(i => mixinSource[i]).join('').slice(0, 32)

  const raw = { ...params, wts: Math.floor(Date.now() / 1000).toString() }
  const sorted = {}
  Object.keys(raw).sort().forEach(k => {
    sorted[k] = String(raw[k]).replace(/[!'()*]/g, '')
  })
  const query = new URLSearchParams(sorted).toString()
  const wRid = crypto.createHash('md5').update(query + mixinKey).digest('hex')
  sorted.w_rid = wRid
  return new URLSearchParams(sorted).toString()
}

// ========== Cookie 格式转换 ==========

/**
 * 将 cookies 对象转为 Cookie 请求头字符串
 * @param {object} cookies
 * @returns {string}
 */
function formatCookiesText(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

export {
  validateCookies,
  loadBotCookies,
  saveBotCookies,
  loadAccountCookies,
  saveAccountCookies,
  listBoundAccounts,
  startLogin,
  getWbiKeys,
  signWbi,
  formatCookiesText,
}
