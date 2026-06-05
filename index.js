import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'util'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 首次运行时从 example 复制配置文件
const configDir = path.join(__dirname, 'config')
const configFile = path.join(configDir, 'config.yaml')
const exampleFile = path.join(configDir, 'config.yaml.example')
if (!fs.existsSync(configFile) && fs.existsSync(exampleFile)) {
  fs.copyFileSync(exampleFile, configFile)
  logger.info('[Bilibili-Plugin] 已从 config.yaml.example 创建配置文件')
}

// 确保 data 目录存在
const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 确保激励全局配置存在
const globalIncentiveCfg = path.join(configDir, 'incentive_config.yaml')
if (!fs.existsSync(globalIncentiveCfg)) {
  const defaultContent = [
    '# ==============================================================',
    '# 全局默认激励配置',
    '# 锅巴后台或主人可直接修改此文件',
    '# ==============================================================',
    '',
    'defaultTrigger:',
    '  - time: "23:29"',
    '    links: []',
    '  - time: "23:59"',
    '    links: []',
    '  - time: "00:29"',
    '    links: []',
    '  - time: "00:59"',
    '    links: []',
    '',
  ].join('\n')
  fs.writeFileSync(globalIncentiveCfg, defaultContent, 'utf8')
  logger.info('[Bilibili-Plugin] 已创建默认激励全局配置')
}

// 确保白名单配置存在
const whitelistDir = path.join(configDir, 'incentive_config')
fs.mkdirSync(whitelistDir, { recursive: true })
const whitelistFile = path.join(whitelistDir, 'whitelist.yaml')
if (!fs.existsSync(whitelistFile)) {
  const wlContent = [
    '# 白名单',
    '# enabled: true 时，只在 users 列表中的 QQ 可使用激励功能',
    'enabled: true',
    'users: []',
    '',
  ].join('\n')
  fs.writeFileSync(whitelistFile, wlContent, 'utf8')
  logger.info('[Bilibili-Plugin] 已创建默认白名单配置')
}

// 确保个人配置模板存在
const userCfgExample = path.join(whitelistDir, 'qq.xxx.example')
if (!fs.existsSync(userCfgExample)) {
  const exampleContent = [
    '# 个人兑换配置',
    '# 文件名: {QQ}.xxx，如 123456.xxx',
    '# 可通过 #激励创建配置 从默认配置生成',
    '',
    'triggers:',
    '  - time: "23:29"',
    '    links: []',
    '  - time: "23:59"',
    '    links: []',
    '  - time: "00:29"',
    '    links: []',
    '  - time: "00:59"',
    '    links: []',
    'notifyGroup: 0',
    '',
  ].join('\n')
  fs.writeFileSync(userCfgExample, exampleContent, 'utf8')
}

const readdir = promisify(fs.readdir)

logger.info('----Bilibili-Plugin----')
logger.info('[Bilibili-Plugin] 初始化中...')

const files = await readdir('./plugins/Bilibili-Plugin/apps').catch(err => logger.error(err))

let ret = []
if (files) {
  files.forEach(file => {
    if (file.endsWith('.js')) {
      ret.push(import(`./apps/${file}`))
    }
  })
}

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  const name = files[i].replace('.js', '')
  if (ret[i].status !== 'fulfilled') {
    logger.error(`[Bilibili-Plugin] 载入错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

logger.info('[Bilibili-Plugin] 载入成功 owo')
logger.info('----Bilibili-Plugin----')

export { apps }
