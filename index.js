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
