import { doClaim } from '../components/Claimer.js'
import { loadLinks, addLink, removeLink } from '../components/Storage.js'
import { getPluginConfig } from '../components/config.js'

export class BiliIncentive extends plugin {
  constructor() {
    super({
      name: '[B站激励]',
      dsc: 'B站UP主激励计划抢奖励',
      event: 'message',
      priority: 500,
      rule: [
        { reg: '^#激励列表$', fnc: 'cmdListLinks' },
        { reg: '^#激励添加\\s+', fnc: 'cmdAddLink' },
        { reg: '^#激励删除\\s*\\d*$', fnc: 'cmdRemoveLink' },
        { reg: '^#激励开始(\\s*\\d*)$', fnc: 'cmdStartClaim' },
      ],
    })
  }

  /**
   * #激励添加 <链接> — 添加活动链接到监控列表
   */
  async cmdAddLink(e) {
    const raw = e.msg.replace(/^#激励添加\s*/, '').trim()
    if (!raw) {
      return e.reply('[B站激励] 请提供活动链接。用法: #激励添加 <链接>')
    }

    let taskId = null
    try {
      const url = new URL(raw)
      taskId = url.searchParams.get('task_id')
    } catch {
      const m = raw.match(/task_id=([^&\s]+)/)
      if (m) taskId = m[1]
    }

    if (!taskId) {
      return e.reply('[B站激励] 未能从链接中提取 task_id，请检查链接格式')
    }

    const link = addLink({ task_id: taskId, url: raw })
    if (!link) {
      return e.reply(`[B站激励] 该活动已在列表中: task_id=${taskId}`)
    }

    e.reply(`[B站激励] 已添加: ID=${link.id}, task_id=${taskId}`)
  }

  /**
   * #激励列表 — 查看已添加的活动链接
   */
  async cmdListLinks(e) {
    const links = loadLinks()
    if (links.length === 0) {
      return e.reply('[B站激励] 暂无活动链接。使用 #激励添加 <链接> 添加，使用 #B站帮助 查看全部指令')
    }

    const msgs = ['[B站激励] 活动列表']
    for (const l of links) {
      msgs.push(`${l.id}. task_id=${l.task_id} | ${l.added_at}`)
    }
    msgs.push(`共 ${links.length} 个 | 使用 #激励开始 [编号] 抢奖励`)
    e.reply(msgs.join('\n'))
  }

  /**
   * #激励删除 [编号] — 删除指定活动链接
   */
  async cmdRemoveLink(e) {
    const m = e.msg.match(/^#激励删除\s*(\d+)$/)
    if (!m) {
      return e.reply('[B站激励] 请提供要删除的编号。用法: #激励删除 <编号>')
    }

    const id = parseInt(m[1], 10)
    const removed = removeLink(id)
    if (!removed) {
      return e.reply(`[B站激励] 未找到编号为 ${id} 的链接。使用 #激励列表 查看`)
    }

    e.reply(`[B站激励] 已删除: ID=${id}, task_id=${removed.task_id}`)
  }

  /**
   * #激励开始 [编号] — 开始抢奖励
   * 不带编号：抢全部 / 带编号：抢指定
   */
  async cmdStartClaim(e) {
    const links = loadLinks()
    if (links.length === 0) {
      return e.reply('[B站激励] 暂无活动链接。请先用 #激励添加 <链接> 添加')
    }

    const m = e.msg.match(/^#激励开始\s*(\d+)?$/)
    const targetId = m?.[1] ? parseInt(m[1], 10) : null

    let targets
    if (targetId) {
      targets = links.filter(l => l.id === targetId)
      if (targets.length === 0) {
        return e.reply(`[B站激励] 未找到编号为 ${targetId} 的链接`)
      }
    } else {
      targets = links
    }

    const config = getPluginConfig()
    const c = config?.incentive?.claim || {}
    const cancelSignal = { cancelled: false }
    const results = []

    for (const link of targets) {
      try {
        await e.reply(`[B站激励] 开始领取: ID=${link.id}, task_id=${link.task_id}`)

        const logCb = (msg) => {
          // 日志静默记录，仅出错时有用
        }

        const { cdkey, awardInfo } = await doClaim(link.task_id, logCb, cancelSignal)

        const resultMsg = [
          '[B站激励] 领取成功！',
          `活动: ${awardInfo.act_name}`,
          `任务: ${awardInfo.task_name}`,
          `奖励: ${awardInfo.award_name}`,
          `cdkey: ${cdkey}`,
        ].join('\n')
        results.push({ link, success: true, cdkey })
        await e.reply(resultMsg)
      } catch (err) {
        if (err.message.includes('已取消')) {
          results.push({ link, success: false, error: '已取消' })
          await e.reply(`[B站激励] ID=${link.id} 已取消`)
          break
        }
        results.push({ link, success: false, error: err.message })
        await e.reply(`[B站激励] ID=${link.id} 领取失败: ${err.message}`)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    await e.reply(
      `[B站激励] 完成: ${successCount} 成功, ${failCount} 失败 (共 ${results.length} 个)`
    )
  }
}
