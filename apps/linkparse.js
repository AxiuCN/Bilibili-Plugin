import { handleMessage, isGroupEnabled } from '../modules/linkparse/index.js'
import { getPluginConfig } from '../components/config.js'

export class LinkFlowParse extends plugin {
  constructor() {
    super({
      name: '[LinkFlow]链接解析',
      dsc: '多平台链接解析与视频下载',
      event: 'message',
      priority: -9999,  // 最低优先级，让其他指令先匹配
      rule: [
        { reg: /^#开启解析$/i, fnc: 'cmdEnable' },
        { reg: /^#关闭解析$/i, fnc: 'cmdDisable' },
        { reg: /https?:\/\//i, fnc: 'autoParse', log: false },
      ],
    })
  }

  /**
   * #开启解析 — 为当前群开启链接解析
   */
  async cmdEnable(e) {
    if (!e.isGroup) {
      return this.reply('[LinkFlow] 仅群聊支持此指令')
    }
    if (!e.isMaster && !e.isAdmin) {
      return this.reply('[LinkFlow] 仅群主/管理员可操作')
    }

    const config = getPluginConfig()
    const allowGroups = config?.linkparse?.download?.allowGroups || []
    const gid = String(e.group_id)
    if (allowGroups.includes(gid)) {
      return this.reply('[LinkFlow] 本群已开启链接解析')
    }

    // 更新白名单（文本级编辑，保留注释）
    // 从配置模板重新生成，简单起见用配置替代方案：设置本群 enabled
    // 实际存储到 linkparse.groupEnabled 映射
    try {
      const fs = await import('node:fs')
      const path = await import('node:path')
      const { pluginRoot } = await import('../components/constants.js')
      const groupFile = path.join(pluginRoot, 'data', 'linkparse_groups.json')

      let groups = {}
      if (fs.existsSync(groupFile)) {
        groups = JSON.parse(fs.readFileSync(groupFile, 'utf8'))
      }
      groups[gid] = true
      if (!fs.existsSync(path.dirname(groupFile))) {
        fs.mkdirSync(path.dirname(groupFile), { recursive: true })
      }
      fs.writeFileSync(groupFile, JSON.stringify(groups, null, 2), 'utf8')
      return this.reply('[LinkFlow] 本群已开启链接解析')
    } catch (err) {
      logger?.error('[LinkFlow-Parse] 保存群解析状态失败:', err)
      return this.reply('[LinkFlow] 操作失败，请查看日志')
    }
  }

  /**
   * #关闭解析 — 为当前群关闭链接解析
   */
  async cmdDisable(e) {
    if (!e.isGroup) {
      return this.reply('[LinkFlow] 仅群聊支持此指令')
    }
    if (!e.isMaster && !e.isAdmin) {
      return this.reply('[LinkFlow] 仅群主/管理员可操作')
    }

    try {
      const fs = await import('node:fs')
      const path = await import('node:path')
      const { pluginRoot } = await import('../components/constants.js')
      const groupFile = path.join(pluginRoot, 'data', 'linkparse_groups.json')

      let groups = {}
      if (fs.existsSync(groupFile)) {
        groups = JSON.parse(fs.readFileSync(groupFile, 'utf8'))
      }
      delete groups[String(e.group_id)]
      fs.writeFileSync(groupFile, JSON.stringify(groups, null, 2), 'utf8')
      return this.reply('[LinkFlow] 本群已关闭链接解析')
    } catch (err) {
      logger?.error('[LinkFlow-Parse] 保存群解析状态失败:', err)
      return this.reply('[LinkFlow] 操作失败，请查看日志')
    }
  }

  /**
   * 自动链接解析 — 消息中含 URL 时触发
   */
  async autoParse(e) {
    const config = getPluginConfig()

    // 总开关
    if (!config?.global?.enabled && config?.global?.enabled !== undefined) return false

    // 解析总开关
    if (config?.linkparse?.enabled === false) return false

    // 群白名单检查（白名单为空 = 所有群启用）
    if (e.isGroup) {
      const allowGroups = config?.linkparse?.download?.allowGroups || []
      if (allowGroups.length > 0 && !allowGroups.includes(String(e.group_id))) {
        // 不在白名单中，检查是否通过 #开启解析 单独启用
        try {
          const fs = await import('node:fs')
          const path = await import('node:path')
          const { pluginRoot } = await import('../components/constants.js')
          const groupFile = path.join(pluginRoot, 'data', 'linkparse_groups.json')
          if (fs.existsSync(groupFile)) {
            const groups = JSON.parse(fs.readFileSync(groupFile, 'utf8'))
            if (!groups[String(e.group_id)]) return false
          } else {
            return false
          }
        } catch {
          return false
        }
      }
    }

    // 处理链接
    await handleMessage(e, e.msg)
    return false  // 不阻断后续处理器
  }
}
