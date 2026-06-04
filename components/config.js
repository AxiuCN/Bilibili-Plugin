import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { pluginRoot } from './constants.js'

/** 插件配置路径 */
const configPath = path.join(pluginRoot, 'config', 'config.yaml')

/**
 * 读取插件配置 (config/config.yaml)
 * @returns {object} 解析后的配置对象
 */
function getPluginConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8')
      return YAML.parse(content) || {}
    }
  } catch (e) {
    logger.error('[Bilibili-Plugin] 读取配置文件失败:', e)
  }
  return {}
}

export { getPluginConfig, configPath }
