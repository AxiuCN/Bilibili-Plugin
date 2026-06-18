# Bilibili-Plugin

B站综合功能插件，支持UP主激励计划定时抢奖励、直播开播/下播推送等功能。

## 安装

在 Yunzai 根目录执行：

> Github
```bash
git clone --depth=1 https://github.com/AxiuCN/Bilibili-Plugin ./plugins/Bilibili-Plugin/
pnpm install -P --filter Bilibili-Plugin
```

> Gitee
```bash
git clone --depth=1 https://gitee.com/AxiuCN/Bilibili-Plugin ./plugins/Bilibili-Plugin/
pnpm install -P --filter Bilibili-Plugin
```

## 指令

### 激励计划

| 指令 | 权限 | 说明 |
|------|------|------|
| `#b站登录` | 所有人 | 扫码登录B站账号 |
| `#b站状态` | 所有人 | 查看当前QQ的登录状态 |
| `#激励创建配置` | 白名单 | 生成个人兑换配置 |
| `#激励添加 <序号> <链接>` | 白名单 | 向个人配置添加兑换链接（1-20） |
| `#激励列表` | 白名单 | 查看个人兑换配置 |
| `#激励删除 <序号>` | 白名单 | 删除指定兑换链接 |
| `#领取每日激励` | 白名单 | 手动领取每日任务激励 |
| `#激励白名单` | 主人 | 查看激励白名单 |
| `#添加激励白名单` | 主人 | 添加QQ到白名单 |
| `#删除激励白名单` | 主人 | 从白名单移除QQ |

### 直播推送

| 指令 | 权限 | 说明 |
|------|------|------|
| `#订阅直播 <room_id>` | 所有人 | 订阅B站直播间开播推送 |
| `#取消订阅直播 <room_id>` | 所有人 | 取消订阅B站直播间 |
| `#订阅UP <uid>` | 所有人 | 订阅B站UP主开播推送 |
| `#取消订阅UP <uid>` | 所有人 | 取消订阅B站UP主 |
| `#本群订阅列表` | 所有人 | 查看本群直播订阅 |
| `#我的订阅列表` | 所有人 | 查看个人直播订阅 |

> 💡 指令前加"全体"@全体成员，"匿名"不@自己。  
> 💡 首次使用激励功能？查看详细图文指南 → [🎁 B站激励兑换指南](docs/incentive-guide.md)

## 功能

- **激励主领取**：每日 `01:00`（可配置）自动执行，使用用户个人配置的链接，并发竞争领取
- **兜底领取**：每日 `23:55`（可配置）自动执行，使用全局每日任务链接
- **直播推送**：每分钟检查订阅的直播间状态，开播/下播自动推送通知
- 领取结果通过 HTML 图片发送至通知群和个人

## 配置

通过锅巴面板或 `config/config.yaml` 配置，参考 `config/config.yaml.example`。

## 免责声明

- 本工具仅供学习交流使用。
- 请遵守 Bilibili 用户协议，使用者自行承担一切责任。

## 交流与讨论

如有问题，请加入 QQ 群 **965272093** 交流反馈。

## 鸣谢

- [GetLiveAward](https://github.com/yuzeeesama/GetLiveAward) — 激励领取接口参考
- [bililivePush-plugin](https://github.com/HDTianRu/bililivePush-plugin) — 直播推送功能基础
