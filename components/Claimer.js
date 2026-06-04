import { BiliClient, BiliCookieInvalidError, formatCookiesText } from './BiliClient.js'
import { loadCookies, saveCookies } from './Storage.js'
import { getPluginConfig } from './config.js'
import { startLogin } from './BiliLogin.js'

/**
 * 构建 BiliClient 实例（从本地 Cookie）
 * @param {object} [opts]
 * @param {number} [opts.timeout]
 * @returns {Promise<BiliClient|null>}
 */
async function createClient(opts = {}) {
  const cookies = loadCookies()
  if (!cookies) return null
  const config = getPluginConfig()
  const timeout = opts.timeout || config?.incentive?.claim?.timeout || 10
  return new BiliClient(cookies, timeout)
}

/**
 * 执行登录 + 校验，返回 client
 * @param {object} opts — 同 startLogin
 * @returns {Promise<BiliClient>}
 */
async function doLogin(opts = {}) {
  const cookies = await startLogin(opts)
  saveCookies(cookies)
  const config = getPluginConfig()
  const client = new BiliClient(cookies, config?.incentive?.claim?.timeout || 10)
  return client
}

/**
 * 对一个 taskId 执行完整的抢奖励流程
 * @param {string} taskId
 * @param {Function} logCb — (msg) => void
 * @param {object} [cancelSignal]
 * @returns {Promise<{cdkey: string, awardInfo: object}>}
 */
async function doClaim(taskId, logCb, cancelSignal) {
  const config = getPluginConfig()
  const claimCfg = config?.incentive?.claim || {}

  // 1. 创建 client
  let client = await createClient()
  if (!client) {
    throw new Error('尚未登录，请先发送 #激励登录')
  }

  // 2. 校验登录态，失效则提示重新登录
  try {
    await client.ensureLoggedIn()
  } catch (e) {
    if (e instanceof BiliCookieInvalidError) {
      throw new Error('登录已失效，请重新发送 #激励登录')
    }
    throw e
  }

  // 3. 查询奖励信息
  logCb(`[任务] 查询奖励信息 task_id=${taskId}`)
  const awardInfo = await client.getAwardInfo(taskId, logCb)
  logCb(`[任务] 活动: ${awardInfo.act_name}`)
  logCb(`[任务] 任务: ${awardInfo.task_name}`)
  logCb(`[任务] 奖励: ${awardInfo.award_name}`)

  // 4. 并发领取
  logCb(`[任务] 开始领取 (${claimCfg.threadCount || 2} 线程, 最多 ${claimCfg.maxRetry || 120} 次重试)`)
  const cdkey = await client.claimAward(taskId, awardInfo, {
    threadCount: claimCfg.threadCount || 2,
    maxRetry: claimCfg.maxRetry || 120,
    retryInterval: claimCfg.retryInterval || 1.0,
    logCb,
    cancelSignal,
  })

  return { cdkey, awardInfo }
}

export { createClient, doLogin, doClaim }
