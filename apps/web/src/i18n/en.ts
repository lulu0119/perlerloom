export const en = {
  meta: {
    title: "Perlerloom",
    description: "Generate and edit crisp bead patterns from uploaded images."
  },
  languageSwitcher: {
    ariaLabel: "Language",
    english: "English",
    chinese: "中文"
  },
  dialog: {
    close: "Close"
  },
  header: {
    logoAlt: "Perlerloom logo",
    taglinePrimary:
      "Preview an image, choose an explicit size, generate a crisp bead chart, then edit it like a craft worksheet."
  },
  welcome: {
    title: "Start a bead chart",
    body: "Import a photo to match colors to beads, or create an empty grid and paint it yourself.",
    importImage: "Import image",
    createNewPattern: "Create new pattern"
  },
  status: {
    importPrompt: "Choose an image, preview it, then generate a chart.",
    sourceTooLarge:
      "Source is larger than {{max}} cells. Choose an explicit target size before generating.",
    readyNoResize: "Ready to generate without resizing.",
    imagePreviewFailed: "Image preview failed.",
    chooseImageBeforeGenerate: "Choose an image before generating.",
    sizeComputeFailed: "Pattern size could not be computed. Check the fields and try again.",
    converting: "Converting image locally…",
    patternGenerated: "Pattern generated locally.",
    imageConversionFailed: "Image conversion failed.",
    emptyGridReady: "Empty grid ready—paint with the pencil or pick colors from the palette.",
    restored: "Restored: {{label}}.",
    emptyCellEyedropper: "That cell is empty—no bead color to pick.",
    noUndo: "No edits to undo.",
    noRedo: "No edits to redo."
  },
  errors: {
    readImageCanvasUnavailable: "Canvas is not available for image conversion.",
    conversionRgbBufferMismatch: "RGB buffer size does not match image dimensions.",
    conversionFailed: "Pattern conversion failed."
  },
  history: {
    generatedPattern: "Generated pattern",
    pencilStroke: "Pencil stroke",
    bucketFill: "Bucket fill",
    line: "Line",
    replace: "Replace",
    delete: "Delete"
  },
  importDialog: {
    title: "New / Import",
    description: "Upload a source image, set size and preprocessing, then generate.",
    sectionUploadPreview: "Upload and preview",
    dropHint: "Drop image here or click to upload",
    formatsHint: "PNG, JPEG, or another browser-supported image",
    chooseSourceImage: "Choose source image",
    selectedSourceAlt: "Selected source image",
    sourceDimensions: "Source: {{width}} × {{height}} px",
    previewNote:
      "Preview is the uploaded image only; the bead grid appears after you tap Generate pattern.",
    emptyPreviewHint: "Image preview appears here before generation.",
    sectionPatternSize: "Pattern size",
    patternSizeHeading: "Pattern size",
    patternSizeIntro:
      "Images up to {{max}} × {{max}} keep their source size by default. Larger images need an explicit target.",
    resizeOriginal: "Original",
    resizeDimensions: "W/H",
    resizeScale: "Scale",
    targetWidth: "Target width",
    targetHeight: "Target height",
    scaleFactor: "Scale factor",
    downsamplingMethod: "Downsampling method",
    nearestNeighbor: "Nearest neighbor",
    gridMode: "Grid mode",
    sectionPreprocessing: "Preprocessing options",
    preprocessingHeading: "Preprocessing",
    preprocessingIntro:
      "Tune color count, match and cluster color space, downsampling, and optional dithering before generating.",
    targetColors: "Target colors",
    targetColorsHint:
      "This is how many k-means clusters are formed before each cluster center is snapped to the nearest bead color. The chart can end up with fewer distinct bead codes when several clusters map to the same palette entry.",
    matchSpace: "Match space",
    clusterSpace: "Cluster space",
    enableDithering: "Enable dithering",
    generatePattern: "Generate pattern",
    generating: "Generating…"
  },
  newPatternDialog: {
    title: "New pattern",
    description:
      "Choose the grid size in beads. You can paint the empty grid with the pencil and other tools.",
    widthLabel: "Width (beads)",
    heightLabel: "Height (beads)",
    widthAria: "Pattern width in beads",
    heightAria: "Pattern height in beads",
    cancel: "Cancel",
    createGrid: "Create grid",
    errors: {
      wholeNumbers: "Width and height must be whole numbers.",
      sizeRange: "Use sizes between 1 and {{max}}."
    }
  },
  workspace: {
    tools: {
      pencil: "Pencil",
      eyedropper: "Eyedropper",
      paintBucket: "Paint bucket",
      hand: "Hand",
      line: "Line"
    },
    editorToolsAside: "Editor tools",
    newImport: "New / Import",
    createNewPattern: "Create new pattern",
    generatedChartPreview: "Generated chart preview",
    magnificationControls: "Magnification controls",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    chartZoom: "Chart zoom",
    editableBeadPattern: "Editable bead pattern",
    paletteAndHistoryAside: "Palette and history",
    openPaletteAndHistory: "Open palette and history",
    dismissPaletteAndHistory: "Dismiss palette and history",
    paletteAndHistoryDialog: "Palette and history"
  },
  chartHud: {
    regionLabel: "Chart tool options",
    hand: "Drag on the chart to scroll the preview.",
    eyedropperIdle: "Move over a bead to preview its color.",
    eyedropperEmpty: "Empty cell — nothing to pick.",
    pencil: "While dragging, the pencil paints a single-bead path.",
    bucket: "Flood fill matches the same color and touches edges.",
    line: "Place the start, move, then release to draw a straight run."
  },
  sidePanels: {
    legendAria: "Legend badges",
    usedInChart: "Used in chart",
    historyTimelineAria: "History timeline",
    history: "History",
    undo: "Undo",
    redo: "Redo",
    legendSelect: "Select {{code}}",
    legendReplace: "Replace {{fromCode}} with active color {{activeColor}}",
    legendReplaceTitle: "Replace {{fromCode}} with {{activeColor}}",
    legendDelete: "Delete {{fromCode}} from pattern",
    legendDeleteTitle: "Delete {{fromCode}}"
  },
  mardPalette: {
    sectionLabel: "Mard palette",
    heading: "Mard palette",
    firstInGroup: "First in group: {{code}}",
    selectColor: "Select palette color {{code}}"
  }
} as const;
