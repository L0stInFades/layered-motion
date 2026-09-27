# 视频与研究档案

三个有效原片原样保留，未转码或删去音轨；两个源文件本来为 0 字节，也原样归档。公开原片放在 [v0.1.0 Release](https://github.com/L0stInFades/layered-motion/releases/tag/v0.1.0)，避免把大型 HEVC 文件放进 Git 历史。

| 文件时间 | 视频轨道时长 | 帧数 | 大小 | 平均帧率 |
|---|---:|---:|---:|---:|
| 12:35:13 | 10.487 s | 255 | 11,805,171 B | 24.316 fps |
| 12:37:27 | 17.785 s | 432 | 12,753,050 B | 24.291 fps |
| 12:47:35 | 19.174 s | 1,722 | 89,762,909 B | 89.808 fps |

均为 2364 × 1672 HEVC，容器含 AAC 音轨。有效原片合计 114,321,130 字节。归档时三段音轨经 `volumedetect` 检测，均值与峰值均约 −91 dB；未改动原音轨。视频可见演示机提示、演示内容与空白传输页面。

## 取回与验证

在仓库根目录运行，需要 GitHub CLI；也可以在 Release 页面手动下载。

```sh
mkdir -p dist
gh release download v0.1.0 --repo L0stInFades/layered-motion \
  --pattern 'source-recordings-2026-09-27.tar.gz' \
  --pattern 'SHA256SUMS' --dir dist
python3 scripts/archive.py restore
python3 scripts/archive.py verify
```

恢复脚本首先检查整个包的 SHA-256，再检查每个原片的字节数和哈希。只恢复来源清单中列出的文件，不覆盖内容不同的已有文件。校验值见 [档案目录](../archive/catalog.json) 和 [来源清单](../analysis/source-manifest.json)。

## 档案结构与来源链

```text
originals/                          Release 恢复的原片；不进入 Git
analysis/source-manifest.json       原始探测元数据、手机/电脑 SHA-256
analysis/*/motion.csv               全部 2,409 帧的 PTS 和基础测量
analysis/frame-by-frame/            147 张连续半尺寸帧及索引
analysis/inner-motion/              原尺寸帧、裁切、轨迹、拟合、浏览器对照
web/reference/                      静音 H.264 播放副本及原始 PTS
archive/evidence-sha256.json         随仓库发布的源帧、CSV 与派生媒体哈希
archive/catalog.json                原片包的大小、哈希、下载位置
```

研究以原片为测量来源。H.264 副本用于网页兼容播放，三个副本各自保持源帧数；JPEG 是导出证据，不是原视频的无损替代。拟合数据再用于 DOM 实现，浏览器测试验证实现与测量的关系。

手机复制时已验证双端哈希一致。公开清单去除了原工作站绝对路径，源文件内容和哈希保持不变；原本的本地实验目录也保留在工作站上。设备序列号不写入公开脚本。

`npm run archive:pack` 可以用恢复后的原片重新生成包。打包使用固定归档元数据，避免把本机用户名和 uid 带入公开附件；不同 Python / zlib 版本可能生成不同压缩字节，原文件哈希仍是内容一致性的依据。

本仓库的版本标签保存代码、规范及逐帧证据；原片附件与标签通过 `catalog.json` 关联。后续修改测量或设计要求时应提升版本并记录变化，不能悄悄替换已有版本的原片。
