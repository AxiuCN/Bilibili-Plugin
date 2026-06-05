import { loadUserConfig, listUserConfigs } from '../components/IncentiveConfig.js'
import { loadAccountCookies } from '../components/Storage.js'
import { doClaim } from '../components/Claimer.js'

/**
 * 获取当前时间的"下一整分钟"字符串（HH:mm 格式）
 * 如 23:28:55 → "23:29"
 * @param {Date} now
 * @returns {string}
 */
function nextMinuteStr(now = new Date()) {
  const d = new Date(now)
  d.setSeconds(0)
  d.setMilliseconds(0)
  d.setMinutes(d.getMinutes() + 1)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * cron 触发时被调用
 * 检查所有有 Cookie 的用户，匹配下一分钟的触发时段，开始领取
 */
async function onCronTick() {
  const targetTime = nextMinuteStr()
  logger.info(`[Bilibili-Plugin] 调度器触发，检查时段: ${targetTime}`)

  const allQq = listUserConfigs()
  if (!allQq.length) return

  for (const qq of allQq) {
    // 没有 Cookie 的跳过
    const cookies = loadAccountCookies(qq)
    if (!cookies) continue

    const cfg = loadUserConfig(qq)
    if (!cfg?.triggers) continue

    // 找到匹配该时段的 trigger
    const trigger = cfg.triggers.find(t => t.time === targetTime)
    if (!trigger || !trigger.links?.length) continue

    // 过滤过期链接
    const now = new Date()
    const validLinks = trigger.links.filter(l => {
      if (!l.expire) return true
      const expireDate = new Date(l.expire)
      return expireDate >= now
    })
    if (!validLinks.length) continue

    // 异步启动领取轮次（不 await，不阻塞其他用户）
    startClaimRound(qq, validLinks, cfg.notifyGroup || 0, targetTime).catch(err => {
      logger.error(`[Bilibili-Plugin] QQ ${qq} 领取轮次异常:`, err)
    })
  }
}

/**
 * 对单个用户的一个时段执行完整领取轮次
 * @param {string|number} qq
 * @param {Array} links - [{ url, task_id?, expire }]
 * @param {number} notifyGroup - 通知群号（0=不通知）
 * @param {string} targetTime - 时段标识，如 "23:29"
 */
async function startClaimRound(qq, links, notifyGroup, targetTime) {
  // 解析任务开始时间 = 下一分钟的 :00 秒（cron 在 :55 秒触发，需等至下一分钟）
  const roundStart = new Date()
  roundStart.setSeconds(0)
  roundStart.setMilliseconds(0)
  roundStart.setMinutes(roundStart.getMinutes() + 1)

  // 确保 roundStart 已到达才执行，最多等待 5s
  const wait = Math.max(0, roundStart.getTime() - Date.now())
  await new Promise(r => setTimeout(r, wait))

  const deadline = Date.now() + 30_000   // +30s 强制停止
  const notifyAt  = Date.now() + 45_000   // +45s 发送通知

  const results = []

  for (const link of links) {
    // 超时检查
    if (Date.now() >= deadline) {
      results.push({ url: link.url, success: false, error: '超时停止' })
      break
    }

    // 从 url 提取 task_id
    let taskId = link.task_id
    if (!taskId) {
      try { taskId = new URL(link.url).searchParams.get('task_id') } catch {}
    }
    if (!taskId) {
      const m = (link.url || '').match(/task_id=([^&\s]+)/)
      if (m) taskId = m[1]
    }
    if (!taskId) {
      results.push({ url: link.url, success: false, error: '无法解析 task_id' })
      continue
    }

    try {
      const { cdkey, awardInfo } = await doClaim(taskId, qq, { cancelled: false })
      results.push({ url: link.url, success: true, awardName: awardInfo.award_name, cdkey })
    } catch (err) {
      results.push({ url: link.url, success: false, error: err.message })
    }
    // 无论成功失败都继续下一个链接
  }

  // 在 +45s 时发送通知
  const delay = Math.max(0, notifyAt - Date.now())
  setTimeout(() => {
    sendNotify(qq, results, notifyGroup, targetTime)
  }, delay)
}

/**
 * 向群发送结果通知
 */
async function sendNotify(qq, results, notifyGroup, targetTime) {
  if (!notifyGroup) return

  const lines = [`[b站插件] ${targetTime} 激励领取结果`]
  for (const r of results) {
    if (r.success) {
      lines.push(`✓ ${r.awardName || '兑换成功'}: ${r.cdkey}`)
    } else {
      lines.push(`✗ ${r.error || '失败'}`)
    }
  }
  const success = results.filter(r => r.success).length
  const fail = results.length - success
  lines.push(`共 ${results.length} 个: ${success} 成功, ${fail} 失败`)

  const msg = lines.join('\n')
  try {
    await Bot.pickGroup(Number(notifyGroup)).sendMsg(msg)
  } catch (e) {
    logger.error(`[Bilibili-Plugin] 发送通知到群 ${notifyGroup} 失败:`, e)
  }
}

export { onCronTick, nextMinuteStr }
