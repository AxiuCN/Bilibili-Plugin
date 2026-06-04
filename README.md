# Bilibili-Plugin
B站综合功能插件，支持UP主激励计划抢奖励、直播推送等功能

## 安装插件
在Yunzai根目录执行命令安装

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

## B站账号

| 指令 | 权限 | 说明 |
|------|------|------|
| `#B站登录` | 所有人 | 扫码登录B站账号 |
| `#B站状态` | 所有人 | 查看登录状态与Cookie有效期 |

## B站激励计划

| 指令 | 权限 | 说明 |
|------|------|------|
| `#激励添加 <链接>` | 所有人 | 添加活动链接到监控列表 |
| `#激励列表` | 所有人 | 查看已添加的活动链接 |
| `#激励删除 <编号>` | 所有人 | 删除指定活动链接 |
| `#激励开始 [编号]` | 所有人 | 抢指定/全部链接的奖励 |

## 通用

| 指令 | 权限 | 说明 |
|------|------|------|
| `#B站帮助` | 所有人 | 查看帮助图 |

---

## 免责声明
* 本工具仅供学习交流使用。
* 请遵守 Bilibili 用户协议，使用者自行承担一切责任。

## 交流与讨论

如有问题，请加入 QQ 群 **965272093** 交流反馈。
