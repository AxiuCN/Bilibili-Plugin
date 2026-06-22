/**
 * guoba/index.js — 统一导出 supportGuoba()
 * 合并各模块 schema，锅巴注册时调用此方法
 */
import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { pluginRoot } from '../components/constants.js'
import { loadUserConfig, saveUserConfig, listUserConfigs, MAX_SLOTS } from '../modules/incentive/Config.js'
import * as mainMod from './main.js'
import * as linkparseMod from './linkparse.js'
import * as subscribeMod from './subscribe.js'
import * as incentiveMod from './incentive.js'

const configPath = path.join(pluginRoot, 'config', 'config.yaml')
const defaultConfigPath = path.join(pluginRoot, 'defSet', 'config.yaml')

/** 合并所有模块的默认值 */
const allDefaults = {
  ...mainMod.getDefaults(),
  ...linkparseMod.getDefaults(),
  ...subscribeMod.getDefaults(),
  ...incentiveMod.getDefaults(),
}

/** 读取模板文件 */
function getTemplate(filePath) {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8')
    logger.error(`[LinkFlow-Guoba] 模板不存在: ${filePath}`)
  } catch (e) {
    logger.error(`[LinkFlow-Guoba] 读取模板失败: ${e}`)
  }
  return ''
}

/** 模板变量替换 */
function generateConfig(templatePath, values) {
  const template = getTemplate(templatePath)
  return template.replace(/\${(\w+)}/g, (_, name) => (values[name] !== undefined ? String(values[name]) : ''))
}

/** 解析 YAML */
function parseYaml(filePath) {
  try {
    if (fs.existsSync(filePath)) return YAML.parse(fs.readFileSync(filePath, 'utf8')) || {}
  } catch (e) {
    logger.error(`[LinkFlow-Guoba] 解析失败: ${filePath}`, e)
  }
  return {}
}

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'linkflow-plugin',
      title: 'LinkFlow-Plugin',
      description: '流媒体聚合解析+B站综合功能插件，支持10平台链接解析下载、UP主动态/直播订阅推送、B站激励计划抢奖励',
      author: ['阿修Axiu'],
      authorLink: ['https://github.com/AxiuCN'],
      link: 'https://github.com/AxiuCN/Bilibili-Plugin',
      isV3: true,
      isV2: false,
      showInMenu: 'auto',
    },
    configInfo: {
      schemas: [
        ...mainMod.getSchema(),
        ...linkparseMod.getSchema(),
        ...subscribeMod.getSchema(),
        ...incentiveMod.getSchema(),
        // ==================== 用户配置列表 ====================
        {
          field: 'incentive.users',
          label: '激励用户配置',
          component: 'GSubForm',
          componentProps: {
            multiple: true,
            schemas: [
              {
                field: 'qq', label: 'QQ', component: 'Input', required: true,
                componentProps: { placeholder: 'QQ号' },
              },
              {
                field: 'notifyGroup', label: '通知群', component: 'InputNumber',
                componentProps: { min: 0, placeholder: '0=不通知' },
              },
              ...Array.from({ length: MAX_SLOTS }, (_, i) => ({
                field: `link${i + 1}`,
                label: i < 10 ? `直播兑换链接${i + 1}` : `看播兑换链接${i + 1}`,
                component: 'Input',
                componentProps: { placeholder: '活动链接（含 task_id）' },
              })),
            ],
          },
        },
      ],

      getConfigData() {
        const userCfg = parseYaml(configPath)
        const claim = userCfg.incentive?.claim || {}
        const watch = userCfg.incentive?.watch || {}
        const linkparse = userCfg.linkparse || {}
        const dl = linkparse.download || {}
        const subscribe = userCfg.subscribe || {}
        const sdyn = subscribe.dynamic || {}
        const slive = subscribe.live || {}
        const spush = subscribe.push || {}

        const userList = listUserConfigs().map(qq => {
          const cfg = loadUserConfig(qq) || { links: [], notifyGroup: 0 }
          const links = Array.isArray(cfg.links) ? cfg.links : []
          const entry = { qq, notifyGroup: cfg.notifyGroup || 0 }
          for (let i = 0; i < MAX_SLOTS; i++) {
            entry[`link${i + 1}`] = links[i] || ''
          }
          return entry
        })

        const dailyLinks = userCfg.incentive?.dailyTaskLinks || []
        const liveCron = userCfg.incentive?.liveCron || userCfg.incentive?.claimCron
        const allowGroups = dl.allowGroups || []

        return {
          // 全局
          'global.enabled': userCfg.global?.enabled ?? true,
          'login.pollTimeout': userCfg.login?.pollTimeout ?? 180,

          // 链接解析
          'linkparse.enabled': linkparse.enabled ?? true,
          'linkparse.bilibili.enabled': linkparse.bilibili?.enabled ?? true,
          'linkparse.douyin.enabled': linkparse.douyin?.enabled ?? true,
          'linkparse.tiktok.enabled': linkparse.tiktok?.enabled ?? true,
          'linkparse.kuaishou.enabled': linkparse.kuaishou?.enabled ?? true,
          'linkparse.weibo.enabled': linkparse.weibo?.enabled ?? true,
          'linkparse.xiaohongshu.enabled': linkparse.xiaohongshu?.enabled ?? true,
          'linkparse.xianyu.enabled': linkparse.xianyu?.enabled ?? true,
          'linkparse.toutiao.enabled': linkparse.toutiao?.enabled ?? true,
          'linkparse.xiaoheihe.enabled': linkparse.xiaoheihe?.enabled ?? true,
          'linkparse.twitter.enabled': linkparse.twitter?.enabled ?? true,
          'linkparse.download.enabled': dl.enabled ?? true,
          'linkparse.download.timeout': dl.timeout ?? 600,
          'linkparse.download.maxSize': dl.maxSize ?? 100,
          'linkparse.download.allowGroups': allowGroups.map(g => ({ groupId: String(g) })),

          // 订阅
          'subscribe.dynamic.enabled': sdyn.enabled ?? true,
          'subscribe.dynamic.cron': sdyn.cron ?? '0 */23 * * * ?',
          'subscribe.live.enabled': slive.enabled ?? true,
          'subscribe.live.cron': slive.cron ?? '10 * * * * ?',
          'subscribe.live.endPush': slive.endPush ?? true,
          'subscribe.push.forward': spush.forward ?? false,
          'subscribe.push.rePush': spush.rePush ?? false,
          'subscribe.push.sleep': spush.sleep ?? 0,

          // 激励
          'incentive.enabled': userCfg.incentive?.enabled ?? true,
          'incentive.liveCron': liveCron ?? '0 0 1 * * ?',
          'incentive.claimDeadline': userCfg.incentive?.claimDeadline ?? 40,
          'incentive.claim.threadCount': claim.threadCount ?? 2,
          'incentive.claim.maxRetry': claim.maxRetry ?? 30,
          'incentive.claim.retryInterval': claim.retryInterval ?? 1.0,
          'incentive.claim.timeout': claim.timeout ?? 10,
          'incentive.watchCron': userCfg.incentive?.watchCron ?? '0 30 0 * * ?',
          'incentive.watchDeadline': userCfg.incentive?.watchDeadline ?? 12,
          'incentive.watch.threadCount': watch.threadCount ?? 1,
          'incentive.watch.maxRetry': watch.maxRetry ?? 30,
          'incentive.watch.retryInterval': watch.retryInterval ?? 1.0,
          'incentive.watch.timeout': watch.timeout ?? 10,
          'incentive.fallbackCron': userCfg.incentive?.fallbackCron ?? '0 55 23 * * ?',
          'incentive.dailyTaskLink1': dailyLinks[0] || '',
          'incentive.dailyTaskLink2': dailyLinks[1] || '',
          'incentive.dailyTaskLink3': dailyLinks[2] || '',
          'incentive.dailyTaskLink4': dailyLinks[3] || '',
          'incentive.users': userList,
        }
      },

      setConfigData(data, { Result }) {
        try {
          const values = { ...allDefaults }
          for (const [key, val] of Object.entries(data)) {
            if (key === 'incentive.users' || key.startsWith('incentive.users')) continue
            if (key === 'linkparse.download.allowGroups' || key.startsWith('linkparse.download.allowGroups')) continue
            values[key.replace(/\./g, '_')] = val
          }
          const content = generateConfig(defaultConfigPath, values)
          const dir = path.dirname(configPath)
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(configPath, content, 'utf8')

          // 保存用户配置
          const users = data['incentive.users'] || []
          for (const entry of users) {
            if (!entry.qq) continue
            const links = Array.from({ length: MAX_SLOTS }, (_, i) => entry[`link${i + 1}`] || '')
            saveUserConfig(String(entry.qq), { links, notifyGroup: entry.notifyGroup || 0 })
          }

          // 保存群白名单（GSubForm 返回数组 {groupId} → 转为 allowGroups）
          const allowGroups = data['linkparse.download.allowGroups'] || []
          if (allowGroups.length > 0 && typeof allowGroups[0] === 'object') {
            // GSubForm 返回对象数组，提取 groupId
            // 文本编辑 config.yaml 更新 allowGroups 列表
            const groupIds = allowGroups.map(g => g.groupId || g.id || '').filter(Boolean)
            if (groupIds.length > 0) {
              try {
                let cfgContent = fs.readFileSync(configPath, 'utf8')
                const lines = cfgContent.split('\n')
                let inDownload = false
                let inAllowGroups = false
                let allowGroupsIdx = -1
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i]
                  if (/^\s*download:\s*$/.test(line)) inDownload = true
                  else if (inDownload && /^\s*[a-z]/.test(line) && !/^\s/.test(line)) inDownload = false
                  if (inDownload && /^\s*allowGroups:\s*$/.test(line)) {
                    allowGroupsIdx = i
                    inAllowGroups = true
                    continue
                  }
                  if (inAllowGroups && /^\s*-/.test(line)) {
                    lines.splice(i, 1)
                    i--
                    continue
                  }
                  if (inAllowGroups && !/^\s*-/.test(line) && !/^\s*$/.test(line) && !/^\s*#/.test(line)) {
                    inAllowGroups = false
                    // 在前面插入新列表
                    const indent = '  '
                    const newItems = groupIds.map(g => `${indent}- '${g}'`)
                    lines.splice(i, 0, ...newItems)
                    break
                  }
                }
                if (inAllowGroups && allowGroupsIdx >= 0) {
                  // 仍在 allowGroups 区域，追加到文件末尾之前
                  const indent = '  '
                  const newItems = groupIds.map(g => `${indent}- '${g}'`)
                  lines.splice(allowGroupsIdx + 1, 0, ...newItems)
                }
                fs.writeFileSync(configPath, lines.join('\n'), 'utf8')
              } catch {}
            }
          }

          return Result.ok({}, '保存成功~')
        } catch (e) {
          logger.error('[LinkFlow-Guoba] 保存配置失败:', e)
          return Result.error('保存失败')
        }
      },
    },
  }
}
