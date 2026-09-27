# 运行、复现与发布

## 运行网页

Node.js 22+。`npm ci` 安装锁定的构建 / 测试依赖；`npm start` 构建静态站点并启动本地服务。端口默认 8787，可用 `MOTION_LAB_PORT` 修改。构建结果在 `_site/`，可部署在网站根路径或 `/layered-motion/` 等子路径。

网页本身不依赖 npm CDN，不需要 Python 或完整原片。`web/` 为交互实验室，根页面为规范与证据入口，Markdown 文档在构建时转为可读 HTML。

## 验证实现

```sh
npm ci
npx playwright install chromium
npm test
```

测试自动在 9876 端口的 `/layered-motion/` 子路径启动构建站点，依次检查规范页面、真实交互、前景轨迹、连续帧检查器，并关闭服务。端口可用 `MOTION_TEST_PORT` 修改。若需检查已启动的站点，设置 `MOTION_TEST_URL` 为带结尾 `/` 的站点根 URL。

可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定已有 Chromium。Linux CI 使用 `npx playwright install --with-deps chromium`；所有依赖版本固定在锁文件，不依赖开发者家目录。

## 从原片重新测量

Python 3.11+、FFmpeg / FFprobe；先按 [归档说明](archive.md) 恢复原片。建议使用 Python 虚拟环境，安装数值依赖时优先使用预编译 wheel。

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install --only-binary=:all: -r requirements.txt
python scripts/archive.py verify
python scripts/analyze_recordings.py
python scripts/frame_by_frame.py
python scripts/inner_motion_study.py
python scripts/track_inner_motion.py
python scripts/track_control_features.py
python scripts/fit_foreground_motion.py
node scripts/export-tokens.mjs
```

基础测量分辨率为 591 × 418，前景轨迹报告换算到 1182 × 836；原尺寸证据为 2364 × 1672。按实际 PTS 解码，未预先转换为固定帧率。JPEG、字体渲染和优化器版本可能产生微小差异；轨迹置信度与残差比二进制相同更适合评价重新拟合。

`npm test` 的哈希检查默认验证发布时的证据快照。重新生成证据后，先比较 CSV、置信度、拟合残差与图像；确认变化可解释，再显式更新派生证据清单并测试：

```sh
git diff -- analysis web/foreground-data.js tokens/
node scripts/inventory-evidence.mjs
npm test
```

不要用更新清单代替核验来源。原片哈希不随测量脚本的输出变化，始终用 `archive.py verify` 检查。

`inner_motion_study.py` 默认复用已有原尺寸导出，避免重复解码；如果要验证解码本身，应在副本中移走 `analysis/inner-motion/native-*.jpg` 后重跑。它根据原始帧号选帧，不根据视频播放器截图时刻选帧。

`calibrate.py` 可重跑早期窗口 / 灰度背景拟合，输出 `calibration-regenerated.json`，不覆盖已归档结果。历史报告中的 RGB 背景颜色校准属于保存的研究结果，其中完整优化过程未整理为独立脚本；**上述命令不宣称重新生成全部颜色校准结果**。核心前景轨迹、时序与原帧链可按上述流程重跑。

重新生成网页副本时使用 H.264、半尺寸、保留源帧顺序和时间戳、不带音轨：

```sh
ffmpeg -i INPUT.mp4 -map 0:v:0 -vf scale=1182:836 \
  -c:v libx264 -crf 19 -preset medium -fps_mode passthrough \
  -an -movflags +faststart OUTPUT.mp4
```

随后用 FFprobe 核对帧数与 PTS；重新编码不会要求与当前副本哈希相同。原片始终保持不变。

## 导入自己的录屏

`import_recordings.py` 是可选 ADB 工具，需要新目录，避免覆盖研究档案：

```sh
python scripts/import_recordings.py --date 2026-09-27 --output /path/to/new-archive
```

多设备连接时加 `--serial YOUR_DEVICE`。现有测量脚本中的 ROI、帧区间和特征模板针对本录屏；导入另一套视频后需要重新定义，不能直接套用当前拟合输出。

## 发布

GitHub Actions 在推送 `main` 后运行全部测试，通过后上传 `_site/` 并部署 GitHub Pages。仓库 Pages 设置使用 GitHub Actions。原片另由版本 Release 附件提供；普通部署不上传 `originals/`、`node_modules/` 或本地归档路径。

参考：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[GitHub 大文件管理](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)。
