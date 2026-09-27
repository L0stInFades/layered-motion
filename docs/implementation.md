# 实现与参数

本项目运行时是原生 HTML / CSS / JavaScript。`web/motion.js` 提供阻尼弹簧解析解；`web/foreground-motion.js` 为各个前景层维护状态，`web/foreground-data.js` 保存源帧拟合值。没有使用预录视频替代可交互区域。

## 通道合同

每个运动通道包含：`x` 当前值、`v` 当前速度、`target` 目标值、`delay` 尚未消费的仿真时间。时间以秒计，位置在 1182 × 836 画布坐标中表达，缩放为无单位比例。

```js
import { Spring } from '../web/motion.js';
const x = new Spring(-300, 600, 49);
x.to(0);                  // 更新目标，保留当前位置与速度
x.step(1 / 60);           // 示例；运行中传 requestAnimationFrame 的真实时间差
x.to(-300);              // 中途反向
```

方程为 `x'' + damping × x' + stiffness × (x − target) = 0`，约定单位质量为 1。`stiffness` 单位 s⁻²，`damping` 单位 s⁻¹。欠阻尼、临界阻尼、过阻尼分别采用解析解。该选择是参考实现，不证明原系统使用相同模型。

## 组合方式

控制中心每个卡片 / 按钮分别拥有 X、Y、scale 通道。网格保持最终排版，中心偏移在子控件上施加。负一屏的搜索、快递、快捷图标、照片、应用分别拥有 X 通道，内部元素共享所属层的变换。

延迟由仿真步进消费，因此慢放、逐帧和交互采用同一路径；反向时旧等待失效。拖动进入的负一屏采用依次减弱的跟随刚度，松手后连接到各层的最终目标。手势阈值和跟随参数是演示实现选择，原片不包含用于直接拟合它们的输入事件。

## 如何复用预设

`tokens/layered-motion.json` 含五层的进入 / 退出 spring 参数、背景稳定状态和证据锚点。字段通过 `tokens/schema.json` 描述。该文件由 `scripts/export-tokens.mjs` 从当前拟合数据导出，站点构建会验证它没有漂移。

1. 先根据产品内容划分语义组，确定主要交互层。
2. 将位移目标映射到自己的组件尺寸，保持比例与像素单位清楚。
3. 以参考参数为起点，检查实际主要行程和尾段；不按列表长度机械增加延迟。
4. 分别调整退出目标与参数，检查中途反向和拖动释放。
5. 实施减少动态效果与焦点规则，再在目标设备上验收。

卡片玻璃、背景色调和图标是本实验的视觉重建。未测量的移动数据卡借用 WLAN 的部分参数，第三排快捷项借用第二排；这些是明确的近似，不能用于声称已测得整个系统。

## 渲染与时间

RAF 使用时间戳，暂停检查器会暂停所有前景推进；媒体时间轴按源 PTS 定位。对照播放以视频时间为唯一时钟，媒体尚未启动或暂停时，复刻也等待，避免自行跑到原片前面。背景通过静态色调表面的透明度混合，再对父层缩放 / 模糊，避免每帧重写整张颜色矩阵。

隐藏标签页重新进入、长帧和低性能设备需要应用层的时间策略；示例不构成对所有硬件的帧率保证。生产实现也应维护可交互区域与可见状态一致，避免视觉隐藏的元素仍接收键盘焦点。

参考文档：[MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)、[MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)。
