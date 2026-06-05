import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'

const pluginRoot = path.join(process.cwd(), 'plugins/Bilibili-Plugin')

// ========== 主配置（config.yaml）==========

const configPath = path.join(pluginRoot, 'config', 'config.yaml')
const defaultConfigPath = path.join(pluginRoot, 'defSet', 'config.yaml')

const mainDefaults = {
  login_pollTimeout: 180,
  incentive_claim_threadCount: 2,
  incentive_claim_maxRetry: 30,
  incentive_claim_retryInterval: 1.0,
  incentive_claim_timeout: 10,
}

function getTemplate(path) {
  try {
    if (fs.existsSync(path)) return fs.readFileSync(path, 'utf8')
    logger.error(`[Bilibili-Plugin] 模板不存在: ${path}`)
  } catch (e) {
    logger.error(`[Bilibili-Plugin] 读取模板失败: ${e}`)
  }
  return ''
}

function generateConfig(templatePath, values) {
  const template = getTemplate(templatePath)
  return template.replace(/\${(\w+)}/g, (_, name) => (values[name] !== undefined ? values[name] : ''))
}

function parseYaml(path) {
  try {
    if (fs.existsSync(path)) return YAML.parse(fs.readFileSync(path, 'utf8')) || {}
  } catch (e) {
    logger.error(`[Bilibili-Plugin] 解析失败: ${path}`, e)
  }
  return {}
}

// ========== 激励配置（incentive_config.yaml）==========

const incentiveCfgPath = path.join(pluginRoot, 'config', 'incentive_config.yaml')
const incentiveTemplatePath = path.join(pluginRoot, 'defSet', 'incentive_config', 'qq.yaml')

const incentiveDefaults = {
  incentive_time_1: '23:29',
  incentive_time_2: '23:59',
  incentive_time_3: '00:29',
  incentive_time_4: '00:59',
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
        { label: 'B站账号', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'login.pollTimeout',
          label: '扫码超时',
          helpMessage: '扫码登录轮询超时时间（秒）',
          bottomHelpMessage: '超过此时间未扫码则自动取消，默认 180 秒',
          component: 'InputNumber',
          required: true,
          componentProps: { min: 30, max: 600, defaultValue: 180 },
        },

        // ==================== 激励计划·领取设置 ====================
        { label: '激励计划·领取设置', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'incentive.claim.threadCount',
          label: '并发线程数',
          helpMessage: '同时发送请求的 worker 数量',
          bottomHelpMessage: '建议 2-5，过高可能触发风控',
          component: 'InputNumber',
          required: true,
          componentProps: { min: 1, max: 10, defaultValue: 2 },
        },
        {
          field: 'incentive.claim.maxRetry',
          label: '单线程重试次数',
          helpMessage: '单个 worker 最大重试次数',
          bottomHelpMessage: '默认 30',
          component: 'InputNumber',
          required: true,
          componentProps: { min: 1, max: 300, defaultValue: 30 },
        },
        {
          field: 'incentive.claim.retryInterval',
          label: '重试间隔（秒）',
          component: 'InputNumber',
          required: true,
          componentProps: { min: 0.1, max: 10, step: 0.1, precision: 1, defaultValue: 1.0 },
        },
        {
          field: 'incentive.claim.timeout',
          label: '请求超时（秒）',
          component: 'InputNumber',
          required: true,
          componentProps: { min: 3, max: 60, defaultValue: 10 },
        },

        // ==================== 激励计划·默认时段 ====================
        { label: '激励计划·默认时段', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'incentive.time_1',
          label: '时段 1',
          bottomHelpMessage: '新用户创建配置时的默认触发时间',
          component: 'Input',
          required: true,
          componentProps: { placeholder: 'HH:mm' },
        },
        {
          field: 'incentive.time_2',
          label: '时段 2',
          component: 'Input',
          required: true,
          componentProps: { placeholder: 'HH:mm' },
        },
        {
          field: 'incentive.time_3',
          label: '时段 3',
          component: 'Input',
          required: true,
          componentProps: { placeholder: 'HH:mm' },
        },
        {
          field: 'incentive.time_4',
          label: '时段 4',
          component: 'Input',
          required: true,
          componentProps: { placeholder: 'HH:mm' },
        },
      ],

      getConfigData() {
        const userCfg = parseYaml(configPath)
        const claim = userCfg.incentive?.claim || {}

        const incentiveCfg = parseYaml(incentiveCfgPath)
        const triggers = (incentiveCfg.defaultTrigger || []).map(t => t.time)

        return {
          'login.pollTimeout': userCfg.login?.pollTimeout ?? mainDefaults.login_pollTimeout,
          'incentive.claim.threadCount': claim.threadCount ?? mainDefaults.incentive_claim_threadCount,
          'incentive.claim.maxRetry': claim.maxRetry ?? mainDefaults.incentive_claim_maxRetry,
          'incentive.claim.retryInterval': claim.retryInterval ?? mainDefaults.incentive_claim_retryInterval,
          'incentive.claim.timeout': claim.timeout ?? mainDefaults.incentive_claim_timeout,
          'incentive.time_1': triggers[0] ?? incentiveDefaults.incentive_time_1,
          'incentive.time_2': triggers[1] ?? incentiveDefaults.incentive_time_2,
          'incentive.time_3': triggers[2] ?? incentiveDefaults.incentive_time_3,
          'incentive.time_4': triggers[3] ?? incentiveDefaults.incentive_time_4,
        }
      },

      setConfigData(data, { Result }) {
        try {
          // 生成主配置
          const mainValues = { ...mainDefaults }
          for (const [key, val] of Object.entries(data)) {
            mainValues[key.replace('.', '_')] = val
          }
          const mainContent = generateConfig(defaultConfigPath, mainValues)
          const dir = path.dirname(configPath)
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(configPath, mainContent, 'utf8')

          // 生成激励全局配置
          const incentiveValues = { ...incentiveDefaults }
          incentiveValues.incentive_time_1 = data['incentive.time_1'] ?? incentiveDefaults.incentive_time_1
          incentiveValues.incentive_time_2 = data['incentive.time_2'] ?? incentiveDefaults.incentive_time_2
          incentiveValues.incentive_time_3 = data['incentive.time_3'] ?? incentiveDefaults.incentive_time_3
          incentiveValues.incentive_time_4 = data['incentive.time_4'] ?? incentiveDefaults.incentive_time_4
          const incentiveContent = generateConfig(incentiveTemplatePath, incentiveValues)
          fs.writeFileSync(incentiveCfgPath, incentiveContent, 'utf8')

          return Result.ok({}, '保存成功~')
        } catch (e) {
          logger.error('[Bilibili-Plugin] 保存配置失败:', e)
          return Result.error('保存失败')
        }
      },
    },
  }
}
