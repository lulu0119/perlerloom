export const zh = {
  meta: {
    title: "珀勒鲁姆",
    description:
      "照片可一键转成拼豆图纸，也可从空白网格起稿——\n对齐调色色号、在练习表式图纸上修改，\n图纸保存在本机浏览器。"
  },
  languageSwitcher: {
    ariaLabel: "语言",
    english: "English",
    chinese: "中文"
  },
  dialog: {
    close: "关闭"
  },
  header: {
    logoAlt: "珀勒鲁姆标志",
    openLibrary: "已保存图纸"
  },
  welcome: {
    title: "开始拼豆图纸",
    body: "导入照片以匹配拼豆颜色，或创建空白网格自行绘制。",
    importImage: "导入图片",
    createNewPattern: "新建图纸",
  },
  status: {
    sourceTooLarge: "源图超过 {{max}} 格。生成前请先选择明确的目标尺寸。",
    readyNoResize: "已准备好，无需缩放即可生成。",
    imagePreviewFailed: "图片预览失败。",
    chooseImageBeforeGenerate: "生成前请先选择图片。",
    sizeComputeFailed: "无法计算图纸尺寸。请检查输入后重试。",
    converting: "正在本地转换图片…",
    patternGenerated: "已在本地生成图纸。",
    imageConversionFailed: "图片转换失败。",
    emptyGridReady: "空白网格已就绪——可用铅笔绘制或从调色板取色。",
    restored: "已恢复：{{label}}。",
    emptyCellEyedropper: "该格为空，没有可吸取的拼豆颜色。",
    noUndo: "没有可撤销的编辑。",
    noRedo: "没有可重做的编辑。",
    librarySaveFailed: "无法将图纸写入浏览器存储。请在图库中把重要图纸导出为文件。",
    patternImportInvalid: "该文件不是有效的珀勒鲁姆图纸导出。",
    patternImported: "图纸已导入到本地库。",
    exportPngFailed: "PNG 导出失败。"
  },
  errors: {
    readImageCanvasUnavailable: "当前环境无法使用画布进行图片转换。",
    conversionRgbBufferMismatch: "RGB 缓冲区大小与图片尺寸不匹配。",
    conversionFailed: "图纸转换失败。"
  },
  history: {
    generatedPattern: "生成的图纸",
    pencilStroke: "铅笔笔划",
    eraserStroke: "橡皮笔划",
    bucketFill: "油漆桶填充",
    line: "直线",
    replace: "替换",
    delete: "删除"
  },
  importDialog: {
    title: "从照片生成图纸",
    description:
      "用图片生成新的拼豆网格。若要打开此前导出的可编辑文件，请使用下方「打开已保存图纸」，不要用照片上传。",
    sectionOpenSavedChart: "打开已保存图纸",
    sectionFromPhoto: "从照片",
    dropHint: "将图片拖放到此处或点击上传",
    formatsHint: "PNG、JPEG 或浏览器支持的其它图片格式",
    chooseSourceImage: "选择源图片",
    selectedSourceAlt: "已选择的源图片",
    sourceDimensions: "源图：{{width}} × {{height}} 像素",
    previewNote: "预览仅为上传图片；点击生成图纸后才会显示拼豆网格。",
    emptyPreviewHint: "生成前将在此处显示图片预览。",
    sectionPatternSize: "图纸尺寸",
    patternSizeHeading: "图纸尺寸",
    patternSizeIntro:
      "宽与高不超过 {{max}} × {{max}} 时默认保持源图尺寸；更大的图片需要指定目标尺寸。",
    resizeOriginal: "原始",
    resizeDimensions: "宽/高",
    resizeScale: "缩放",
    targetWidth: "目标宽度",
    targetHeight: "目标高度",
    scaleFactor: "缩放比例（%）",
    downsamplingMethod: "缩小采样方式",
    nearestNeighbor: "最近邻",
    gridMode: "网格模式",
    sectionPreprocessing: "预处理选项",
    preprocessingHeading: "预处理",
    preprocessingIntro: "在生成前调整颜色数量、匹配与聚类色彩空间，以及缩小采样。",
    targetColors: "目标颜色数",
    targetColorsHint:
      "这是 k-means 聚类的数量，每个聚类中心再吸附到最近的拼豆颜色。若多个聚类映射到同一调色板条目，最终图纸上不同色号可能更少。",
    matchSpace: "匹配色彩空间",
    clusterSpace: "聚类色彩空间",
    generatePattern: "生成图纸",
    generating: "正在生成…"
  },
  newPatternDialog: {
    title: "新建图纸",
    description: "以拼豆格数设置网格大小。可用铅笔等工具在空白网格上绘制。",
    widthLabel: "宽度（格）",
    heightLabel: "高度（格）",
    widthAria: "图纸宽度（格）",
    heightAria: "图纸高度（格）",
    cancel: "取消",
    createGrid: "创建网格",
    errors: {
      wholeNumbers: "宽度和高度必须是整数。",
      sizeRange: "尺寸须在 1 到 {{max}} 之间。"
    }
  },
  workspace: {
    tools: {
      pencil: "铅笔",
      eraser: "橡皮",
      eyedropper: "吸管",
      paintBucket: "油漆桶",
      hand: "抓手",
      line: "直线"
    },
    editorToolsAside: "编辑工具",
    toolRailPreviousPage: "绘制工具",
    toolRailNextPage: "导入与导出",
    toolRailPagerLabel: "编辑工具，第 {{page}} / 2 页",
    newImportTooltip: "从照片新建图纸：上传图片、调整选项后生成。",
    createNewPatternTooltip: "从空白拼豆网格开始绘制。",
    patternLibraryTooltip: "打开本机已保存的图纸。",
    exportImageTooltip: "导出可分享或打印的图纸图片。",
    exportFileTooltip: "下载可在本应用再次打开的编辑文件。",
    newImport: "照片生成",
    createNewPattern: "新建图纸",
    magnificationControls: "缩放控制",
    zoomOut: "缩小",
    zoomIn: "放大",
    zoomOutTooltip: "缩小图纸预览（格子更粗，同屏可见范围更大）。",
    zoomInTooltip: "放大图纸预览（格子更细）。",
    chartZoom: "图纸缩放",
    editableBeadPattern: "可编辑的拼豆图纸",
    paletteAndHistoryAside: "调色板与历史",
    openPaletteAndHistory: "打开调色板与历史",
    openPaletteAndHistoryTooltip: "Mard 调色板、图纸中出现的颜色，以及撤销时间线。",
    dismissPaletteAndHistory: "关闭调色板与历史",
    paletteAndHistoryDialog: "调色板与历史"
  },
  chartHud: {
    regionLabel: "图纸工具选项",
    hand: "在图纸上拖动以滚动预览。",
    eyedropperIdle: "移动到拼豆格上以预览颜色。",
    eyedropperEmpty: "空格 — 无可吸取内容。",
    pencil: "拖动时铅笔会沿路径逐格绘制。",
    eraser: "拖动时橡皮会沿路径清除拼豆格。",
    bucket: "油漆桶填充相同颜色并接触边缘的区域。",
    line: "按下起点，移动，松开以绘制直线。",
    chooseDrawingColor: "为铅笔、油漆桶和直线工具选择当前绘制色号。"
  },
  library: {
    dialogTitle: "图纸库",
    dialogDescription: "在本浏览器中管理图纸：打开已有图纸、导出图片，或下载可编辑文件以便迁移或分享。",
    searchLabel: "搜索",
    searchPlaceholder: "按标题搜索",
    sortLabel: "排序",
    sortUpdated: "最近更新",
    sortCreated: "最近创建",
    sortTitle: "标题 A–Z",
    emptyFiltered: "没有匹配的图纸。",
    metaLine: "更新 {{updated}} · 创建 {{created}}",
    renameAria: "重命名 {{title}}",
    open: "打开",
    duplicate: "复制",
    exportPng: "导出图片",
    exportImageHint: "导出这张图纸的图片。",
    exportJson: "导出文件",
    exportFileHint: "下载可在本应用再次打开的编辑文件。",
    delete: "删除",
    confirmDelete: "确定从本浏览器删除该图纸？",
    importJson: "导入已保存文件",
    importSavedHint: "选择此前从此应用导出的可编辑图纸文件。",
    done: "完成",
    defaultTitle: "未命名图纸",
    importedTitle: "导入的图纸",
    duplicatedTitleSuffix: "副本"
  },
  sidePanels: {
    legendAria: "图例色块",
    usedInChart: "图纸中使用",
    historyTimelineAria: "历史时间线",
    history: "历史",
    undo: "撤销",
    redo: "重做",
    legendSelect: "选择 {{code}}，图纸中共 {{count}} 颗",
    legendReplace: "用当前颜色 {{activeColor}} 替换 {{fromCode}}",
    legendReplaceTitle: "将 {{fromCode}} 替换为 {{activeColor}}",
    legendDelete: "从图纸中删除 {{fromCode}}",
    legendDeleteTitle: "删除 {{fromCode}}",
    undoTooltip: "在时间线上后退一步修改。",
    redoTooltip: "在撤销之后重放下一步修改。"
  },
  mardPalette: {
    sectionLabel: "Mard 调色板",
    heading: "Mard 调色板",
    firstInGroup: "分组中首个：{{code}}",
    selectColor: "选择调色板颜色 {{code}}"
  }
} as const;
