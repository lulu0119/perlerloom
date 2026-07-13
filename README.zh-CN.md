<p align="center">
  <img src="./apps/web/public/android-chrome-192x192.png" width="96" alt="豆织工坊标志" />
</p>

<h1 align="center">豆织工坊</h1>

<p align="center">
  把照片与像素图变成可编辑、可落地制作的拼豆图纸。
</p>

<p align="center">
  <a href="./README.md">English</a>
  ·
  <a href="#豆织工坊是什么">豆织工坊是什么？</a>
  ·
  <a href="#为什么使用它">为什么使用它？</a>
  ·
  <a href="#本地体验">本地体验</a>
  ·
  <a href="#开发">开发</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-ready-3178c6" />
  <img alt="本地优先" src="https://img.shields.io/badge/local--first-image%20conversion-f2b544" />
</p>

> [!NOTE]
> 豆织工坊在浏览器中完成图片转图纸流程。你可以导入图片、预览效果、选择最终拼豆尺寸，并在不上传源图到服务器的情况下生成图纸。

> [!TIP]
> 想得到更清晰的手工图纸，可以先指定较小的目标尺寸，再按需要调整目标颜色数。

## 豆织工坊是什么？

豆织工坊（Douloom）是一个面向手作爱好者的拼豆图纸编辑器。它不是只把图片像素化给你看，而是帮助你得到一张可以继续调整、可以照着制作的图纸。

导入照片、图标或像素图，选择成品要有多少格拼豆，再让豆织工坊把颜色匹配到 Mard 拼豆色板。生成后，你仍然可以在网格上继续编辑：画笔、油漆桶、直线、吸管、调色板、图例和撤销/重做都已经准备好。

它的目标很简单：让你更快从灵感走到可用图纸，同时保留手工调整的空间。

## 为什么使用它？

- 本地图片转换：源图保留在你的设备上，不需要上传到服务器。
- 明确尺寸控制：可以指定宽度、高度或缩放比例，避免大图生成出难以制作的图纸。
- 真实色板匹配：生成结果会吸附到 Mard 拼豆色号，而不是停留在任意屏幕颜色。
- 手工友好的编辑器：可读网格、图例色块、画笔、油漆桶、直线、抓手和吸管工具都围绕制作流程设计。
- 中英文界面：可在应用内直接切换语言。

## 当前进度

- [x] Mard 291 色拼豆色板数据
- [x] 浏览器内图片预览与转换
- [x] 使用 Web Worker 处理较重的转换任务
- [x] 可选抖动与目标颜色数调整
- [x] 可编辑拼豆网格、调色板、图例、工具和历史记录
- [x] 中文与英文界面
- [x] 适合打印的 PNG 导出（网格、色号图例、页眉；编辑器与图库均可下载）
- [ ] 网格对齐、裁剪图片、导入其他软件导出的图纸，按色号匹配或通过 OCR 匹配
- [ ] 颜色缩限：标记部分色号不可用并将颜色映射到可用范围；导入与编辑流程均支持（面向色号不全的玩家）
- [ ] 镜像变换
- [ ] 设置：语言迁入设置页；色彩管理（色域、豆子品牌，与色板缩限联动）；导出 JSON 记录当前色彩配置；大网格开关与间距（默认开启，5×5）；图纸上是否显示色号
- [ ] 豆板垫图模式（独立视图）：设备置于透明豆板下时的精细对齐缩放、防误触锁定、单色高亮便于铺豆
- [ ] 云端保存与分享：图纸哈希/指纹，本地与远端数据合并策略
- [ ] AI 辅助像素图转换

## 本地体验

```bash
pnpm install
pnpm dev
```

然后打开 Next.js 在终端中输出的本地地址。

以下云端配置只用于后续保存与分享功能：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

免费的转换器和编辑器不依赖 Supabase 凭据。

## 开发

这个仓库是 pnpm workspace。Web 应用位于 `apps/web`，共享包位于 `packages/*`。

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 致谢

豆织工坊（Douloom）基于 Next.js、React、Tailwind CSS、shadcn-compatible UI primitives、Vitest，以及转换器使用的 Mard 拼豆色板数据构建。
