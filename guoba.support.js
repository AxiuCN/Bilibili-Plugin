import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'

const pluginRoot = path.join(process.cwd(), 'plugins/Bilibili-Plugin')
const configPath = path.join(pluginRoot, 'config', 'config.yaml')
const defaultConfigPath = path.join(pluginRoot, 'defSet', 'config.yaml')

/** 默认值映射（模板变量名 → 默认值） */
const defaultValues = {
  login_pollTimeout: 180,
  incentive_claim_threadCount: 2,
  incentive_claim_maxRetry: 30,
  incentive_claim_retryInterval: 1.0,
  incentive_claim_timeout: 10,
}

function getTemplate() {
  try {
    if (fs.existsSync(defaultConfigPath)) {
      return fs.readFileSync(defaultConfigPath, 'utf8')
    }
    logger.error('[Bilibili-Plugin] 默认配置模板不存在:', defaultConfigPath)
  } catch (e) {
    logger.error('[Bilibili-Plugin] 读取默认配置模板失败:', e)
  }
  return ''
}

function generateConfig(data) {
  const values = { ...defaultValues }
  for (const [key, val] of Object.entries(data)) {
    const varName = key.replace('.', '_')
    values[varName] = val
  }
  const template = getTemplate()
  return template.replace(/\${(\w+)}/g, (_, name) => (values[name] !== undefined ? values[name] : ''))
}

function parseCurrentConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8')
      return YAML.parse(content) || {}
    }
  } catch (e) {
    logger.error('[Bilibili-Plugin] 解析当前配置失败:', e)
  }
  return {}
}

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'bilibili-plugin',
      title: 'Bilibili-Plugin',
      description: 'B站综合功能插件，支持UP主激励计划抢奖励、直播推送等功能',
      author: ['阿修Axiu'],
      authorLink: ['https://github.com/AxiuCN'],
      link: 'https://github.com/AxiuCN/Bilibili-Plugin',
      isV3: true,
      isV2: false,
      showInMenu: 'auto',
      iconPath: path.join(pluginRoot, 'resources/images/icon.ico'),
    },
    configInfo: {
      schemas: [
        // ==================== B站账号 ====================
        {
          label: 'B站账号',
          component: 'SOFT_GROUP_BEGIN',
        },
        {
          field: 'login.pollTimeout',
          label: '扫码超时',
          helpMessage: '扫码登录轮询超时时间（秒）',
          bottomHelpMessage: '超过此时间未扫码则自动取消，默认 180 秒',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 30,
            max: 600,
            defaultValue: 180,
          },
        },
        // ==================== 激励计划·领取设置 ====================
        {
          label: '激励计划·领取设置',
          component: 'SOFT_GROUP_BEGIN',
        },
        {
          field: 'incentive.claim.threadCount',
          label: '并发线程数',
          helpMessage: '同时发送请求的 worker 数量',
          bottomHelpMessage: '建议 2-5，过高可能触发风控',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 1,
            max: 10,
            defaultValue: 2,
          },
        },
        {
          field: 'incentive.claim.maxRetry',
          label: '单线程重试次数',
          helpMessage: '单个 worker 最大重试次数',
          bottomHelpMessage: '默认 30，重试间隔 x 重试次数 = 最大等待时间',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 1,
            max: 300,
            defaultValue: 30,
          },
        },
        {
          field: 'incentive.claim.retryInterval',
          label: '重试间隔',
          helpMessage: '两次重试之间的等待时间（秒）',
          bottomHelpMessage: '默认 1.0 秒',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 0.1,
            max: 10,
            step: 0.1,
            precision: 1,
            defaultValue: 1.0,
          },
        },
        {
          field: 'incentive.claim.timeout',
          label: '请求超时',
          helpMessage: '单次 HTTP 请求超时时间（秒）',
          bottomHelpMessage: '默认 10 秒',
          component: 'InputNumber',
          required: true,
          componentProps: {
            min: 3,
            max: 60,
            defaultValue: 10,
          },
        },
      ],
      getConfigData() {
        const userConfig = parseCurrentConfig()
        const login = userConfig.login || {}
        const claim = userConfig.incentive?.claim || {}
        return {
          'login.pollTimeout': login.pollTimeout ?? defaultValues.login_pollTimeout,
          'incentive.claim.threadCount': claim.threadCount ?? defaultValues.incentive_claim_threadCount,
          'incentive.claim.maxRetry': claim.maxRetry ?? defaultValues.incentive_claim_maxRetry,
          'incentive.claim.retryInterval': claim.retryInterval ?? defaultValues.incentive_claim_retryInterval,
          'incentive.claim.timeout': claim.timeout ?? defaultValues.incentive_claim_timeout,
        }
      },
      setConfigData(data, { Result }) {
        try {
          const content = generateConfig(data)
          const dir = path.dirname(configPath)
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(configPath, content, 'utf8')
          return Result.ok({}, '保存成功~')
        } catch (e) {
          logger.error('[Bilibili-Plugin] 保存配置失败:', e)
          return Result.error('保存失败')
        }
      },
    },
  }
}
