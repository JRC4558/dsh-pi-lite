# dsh-pi-lite

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的最小 Pi 风格模式。只用标准工具：`read`、`write`、`edit`、`bash`、`skill`、`read_image`、`web_search`、`web_fetch`。保留 Pi 的工具分配和硬预算，去掉所有把模式绑定到某台工作站的依赖。

## 是什么

- 一个 DSH **bundle**（一个 preset）加一个很小的 TypeScript 策略插件。
- 超时看门狗、工具白名单、每轮调用预算、重复调用保护、会话 token 预算、每会话图片/搜索配额。
- 自带 `pi-lite` skill，安装时复制到 `$DSH_HOME/skills/pi-lite`，技能目录自动发现。
- 不设置、也不限制模型的推理强度。

## 安装

```sh
npm install dsh-pi-lite
# 或装进某个 DSH profile：
dsh plugin --profile <profile> add dsh-pi-lite
```

然后在会话中选择 `pi-lite` preset。安装脚本会把 skill 复制到 `${DSH_HOME:-~/.dsh}/skills/pi-lite`；如果你用 `--ignore-scripts`，请自行复制 `skills/pi-lite`。

要求：DeepSeek Harness 提供 agent preset 和标准工具包（`dsh-persona`、`dsh-tool-bash`、`dsh-tool-fs`、`dsh-tool-skill`、`dsh-skill-filesystem`、`dsh-tool-web`）以及 `read_image`。模式本身只需要一个 POSIX `bash`；Windows 使用你的 DSH 安装已经提供的 shell 实现。

## 预算

| 限制 | 默认值 |
|---|---|
| 每轮工具调用 | 40 |
| 相同调用 | 3 |
| 轮次时限 | 30 分钟 |
| 会话时限 | 4 小时 |
| 会话 token（输入+输出） | 2,000,000 |
| 每会话 `web_search` | 5 |
| 每会话 `read_image` | 10 |

全部可在 `cordis.patch.yml` 中调整。触发限制时 harness 取消当前轮；模型应报告已验证状态和下一步，而不是继续重试。

## 布局

```
src/index.ts        策略钩子（看门狗、白名单、预算、配额）
src/policy.ts       纯函数，单测覆盖
cordis.patch.yml    pi-lite preset
skills/pi-lite/     自带 skill
scripts/install-skill.mjs
tests/              策略测试
```

构建与验证：

```sh
npm install --ignore-scripts
npm run build
npm test
npm pack --dry-run
```

## Vibe coding 声明

这是一个 vibe coding 项目：由 DeepSeek V4.1 Flash 在 DeepSeek Harness 中生成，维护者负责范围与结果审阅。不接受 PR，提交会被直接关闭；没有支持承诺。可以把它当作一个可读、可 fork 的小起点。

## 许可证

MIT。第三方组件见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。
