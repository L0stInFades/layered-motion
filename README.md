# 层序 · Layered Motion

**优雅，发生在先后之间。**

一套从真实录屏逐帧提炼的动效设计规范：下拉浮窗、控制中心与负一屏。包含可打断的交互实现、147 张连续原帧、特征轨迹、拟合代码与完整视频档案。

[阅读规范与交互图解](https://l0stinfades.github.io/layered-motion/) · [动效实验室](https://l0stinfades.github.io/layered-motion/web/) · [下载原片档案](https://github.com/L0stInFades/layered-motion/releases/tag/v0.1.0)

## 这套规范关注什么

背景让出注意力，内容分层到位；语义相同的内容保持共同运动，不同层有自己的收尾。进入、退出分别设计，中途反向从当前位置和速度继续。

负一屏在 3.935 s 时，搜索栏距终点仅剩 44 px，底部应用还差 270.5 px。控制中心退出到 1.556 s 时，按钮图案尺度约为稳定状态的 79%，中心间距仍约为 92%。这些细节决定了层次与轻盈感。

数值来自本次录屏，坐标为 1182 × 836。通用要求、原片观察、实现拟合与设计建议分别标注；拟合值不是原系统内部参数。

## 从哪里开始

| 读者 | 入口 |
|---|---|
| 设计师 | [动效规范 v0.1](docs/specification.md)、[优雅感的来源](docs/elegance.md) |
| 工程师 | [实现与参数](docs/implementation.md)、[机器可读预设](tokens/layered-motion.json) |
| 研究者 | [逐帧时序复查](analysis/图标时序复查.md)、[复现流程](docs/reproduction.md) |
| 素材归档 | [档案说明](docs/archive.md)、[来源清单](analysis/source-manifest.json)、[Release](https://github.com/L0stInFades/layered-motion/releases/tag/v0.1.0) |
| 验收 | [验收标准](docs/acceptance.md)、`npm test` |

## 本地运行

Node.js 22 或更新版本。运行网页不需要 Python、ADB 或原始 HEVC 视频。

```sh
npm ci
npm start
```

打开 <http://127.0.0.1:8787/>。规范站点和实验室可离线运行；网页无第三方运行时、字体服务或追踪器。构建依赖使用 npm 锁文件固定版本。

```sh
npx playwright install chromium
npm test
```

Linux CI 首次安装浏览器时使用 `npx playwright install --with-deps chromium`。测试会自行启动服务并关闭；已有浏览器可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定。详细说明见 [复现流程](docs/reproduction.md)。

## 档案范围

- 3 段有效原片：255、432、1,722 帧，共 2,409 帧；保留实际 PTS。
- 147 张重点过程连续帧：控制中心进入/退出、负一屏进入/退出；包含原尺寸图与局部裁切。
- 2 个原本为 0 字节的同名文件，保留来源记录，不计为有效视频。
- 原片放在 Release 附件，网页播放副本和测量证据随仓库提供。恢复后可用 SHA-256 验证。

代码与文档采用 [MIT](LICENSE)。原片及其中的界面素材另见 [媒体说明](MEDIA_NOTICE.md)。这是独立的动效研究与参考实现。

参与改进见 [贡献与版本规则](docs/contributing.md)。

## English

Layered Motion is an evidence-led motion design specification for floating panels and an assistant page. It documents semantic grouping, layered arrival, independent geometry, entry/exit asymmetry and interruptible motion. The repository includes an interactive DOM reconstruction, measured landmarks, 147 consecutive source frames, analysis scripts and an archived recording release.

Read the [English overview](docs/overview.en.md). Chinese is the normative language for version 0.1. Sample spring values are empirical reference presets, not universal requirements or recovered OS internals.
