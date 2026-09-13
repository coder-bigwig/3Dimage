# 原站 3D 阅片器（yimiji/hexaviewcase）复刻路线图

> 目的：在你当前项目 `D:\3Dimage`（干净复刻实现）中，尽可能贴近参考站
> `https://yimiji.com.cn/hexaviewcase/viewer.html` 的三维阅片体验。
> 参考材料：`D:\imagetry`（已本地化的原站静态阅片器 + 代理服务）。

---

## 0. 先给结论

1. **100% 二进制级 1:1 复刻不可行，也不需要。** 原站的 3D 内核是闭源自研引擎
   （`jimGL` / `renderGL` / `jimDat` 为一个 emscripten 编译产物），模型格式私有，
   直接“抄渲染代码”既不可维护也有法律风险。
2. **可行且高价值的是“行为级 + 视觉级复刻”**：用你已经建好的
   `rendering-core` + GLB 管线，把**交互、布局、工具、配色、视角、相机行为**
   逐项对齐原站。你现在已经走在正确路线上（`ViewerEngine` 里连“0.5°/30ms 的自动
   旋转速度”都按参考站对齐了）。
3. **最大的缺口不是渲染，而是“数据 + 2D 影像 + 高级功能”**：
   - 3D 模型：目前只有公开肺数据（MSD Task06），原站的“病例→结果→分层模型”链路未对齐；
   - 2D 影像：`CtPreview.tsx` 目前是纯 CSS 占位，没有真正的 DICOM/MPR；
   - 高级功能：分段编辑、切割、血管标记、报告/评估、模树 基本空缺。

---

## 1. 这个链接到底是什么（先把目标定义清楚）

`para` 参数（Base64）解码后：

```json
{
  "viewcase": 1,
  "visitor_id": "3258",
  "self_account": 0,
  "caseID": "36351",
  "resultName": "002_bizq\\result-3",
  "defaultLan": "zh",
  "hidePatient": "0",
  "autoSwitch": 1,
  "visitor_token": "<JWT: exp 2026-09-12 04:18:17, user_id 3258>"
}
```

即：**一个手机优先的医学影像分享阅片器**，可看某个病例（caseID 36351）下某个
“结果”（`002_bizq/result-3`）的三维模型与二维影像。带访客 JWT 鉴权。

原站整体分 6 个标签页：案例 / 影像(2D) / **模型(3D)** / 交流 / 我的 / 下载。
你要复刻的“3D 建模”核心 = **模型页**（3D 渲染 + 工具栏 + 模树 + 视图布局）。

---

## 2. 原站架构解剖（证据来自 `D:\imagetry\public\hexaviewcase`）

### 2.1 分层结构

| 层 | 文件 | 作用 |
|---|---|---|
| 入口 | `viewer.html` (43 KB) | 解析 `para`、加载脚本、定义全部 DOM |
| 应用层 | `TriTreeViewer/TriAll.min.js` (866 KB) | 主逻辑：标签页、3D/2D 视图、模树、测量、方案、交流 |
| 应用辅助 | `TriTreeViewer/{gFunctions,viewer_onload,network,myStorage,appFileList,language,myMsgDialog}.js` | 工具函数、启动流程、i18n、本地存储 |
| 3D 场景 | `jimGL/SceneAll.min.js` (62 KB) | 场景/节点/相机 |
| 3D 渲染 | `renderGL/renderAll.min.js` (187 KB) | WebGL 渲染、颜色表、标注渲染 |
| 3D 库 | `jimLib/JimAll.min.js` (59 KB) | 数学/几何/拾取 |
| 3D 内核 | `js/jimDat/jimModule.js` (1.96 MB, emscripten) + `callJim.min.js` | C++ 编译的核心：网格、分割、切割运算；用 IndexedDB(FS/IDBFS) 缓存文件 |
| 2D 影像 | `js/dwv/**`, `js/dwv/dicom`, `lossless-min.js` | DICOM 解析（DWV） |
| 第三方 | `js/jquery`, `md5`, `localforage`, `layer`, `split.js`, `html2canvas`, `exif`, `recorder`, `clipboard` | DOM/存储/弹层/截图/录音 |

### 2.2 布局模板系统（原站很特别的一点）

`data/layout/tab*/NNN.txt` 是**HTML 片段模板**，运行时拼装页面：

- 视图编号：`200`=纯3D、`201`=横断面、`202`=冠状面、`203`=矢状面、`204`=3D+横断面、
  `205`=3D+模树、`206`=横断面+模树、`207/208`=冠状/矢状+模树、**`209`=3D+血管标记**、
  `210`=3D+冠状面、`211`=3D+矢状面、**`212`=3D+AR**、**`213`=3D+裁剪框**
- 例：`tabImg/200.txt`
  ```html
  <div id="Layout_200" class="totalPage">
    <div name="barMenu"></div><div name="barImage"></div>
    <div id="imgContent" class="imgContent"><div name="view3D"></div></div>
  </div>
  ```
> 你的 `ViewerShell.tsx` 用 `viewPresentations` 映射表 + 条件渲染已覆盖主要视图，
> 语义等价，无需照搬模板文件，但**建议把 209/212/213 三个视图也纳入映射**以便后补。

### 2.3 后端接口链路

- API 基址：`https://yimiji.com.cn/index.php/api/...`
- 关键端点（从 `TriAll.min.js` 提取）：
  - `casectl/pagecase`、`casectl/getCaseInfo`、`getUploadedResults`
  - **`filectl/getfileurl`** ← 拿到模型/影像文件的签名地址
  - `filectl/copyobject`、`filectl/sendsplitfile`、`filectl/sendcombinecmd`（分割/合并运算）
  - `plan/*`（getplanlist/getplan/updateplan/deleteplan）、`reportctl/*`、`session/*`、`share/*`
- 鉴权：`para` → `visitor_id + visitor_token(JWT)`；请求带 `authorization`。

### 2.4 模型数据链路（复刻 3D 的关键）

```
viewer.html (para)
   └─ getUploadedResults(caseID) ──► 结果列表
        └─ loadResult(caseID, resultName)
             ├─ filectl/getfileurl ──► { data: "//<OBS 签名URL>" }
             └─ 下载模型 → 交给 jimModule 解析 → 场景树
```

- 签名 URL 的 host 白名单（见 `imagetry/server/app.ts`）：
  - `hexa3d.obs.cn-east-3.myhuaweicloud.com`（华为云 OBS）
  - `cdn.hexalotus.com`
- **签名 URL 不带 CORS 头**，所以 `imagetry` 里做了同源代理：
  - 转发：`/hexaApiServer/**`、`/saleApiServer/**` → `https://yimiji.com.cn/...`
  - 资源代理：`/hexaApiServer/__resource?url=<签名URL>`（改写 `getfileurl` 返回值）
- 资源 Key 形如 `.../002_bizq/result-3/...`（对应 `resultName`）。

### 2.5 功能矩阵（模型页）

- 工具栏：重置 / 分段 / 方案 / 标注(二维标注·三维标注) / 测量 / 视图
- 视图菜单：三维、影像、三维+横断面、冠状面、矢状面、三维+冠状面、三维+矢状面、三维+AR、裁剪框
- 模树（结构树）：分段 / 报告(通用·肺·胆管·胰腺) / 评估 / 标记 /
  切除运算：肺切除 / 肝切除 / 肝段切 / 通用切 / 颅窗切
- 场景控制：单指旋转 / 双指缩放 / 平移 / 自动旋转(`model_rotate`) / 背景切换(BG)
- 2D 影像页：4 宫格 canvas（1x1/2x1/3x1/2x2 + MPR）、翻页 / 移动 / 缩放 / 调窗 /
  窗宽窗位预设(骨/肺/腹/脑/软组织/肝/纵膈/卒中/CTA)、LUT(rainbow/hot/pet…)、测量、标注、系列选择

---

## 3. 你当前项目 `D:\3Dimage` 的现状

### 3.1 技术栈

- 前端 `front/`：React 19 + TypeScript 6 + Vite 8 + Three.js 0.185 + Zustand + React Query
- 渲染核心 `front/packages/rendering-core/`（自研，干净实现）：
  - `ViewerEngine`（OrbitControls、自动旋转、裁剪面、视图预设、状态序列化）
  - `LayerManager` / `GlbLayerLoader` / `ManifestLoader` / `QualityManager`(low/medium/high)
  - `tools/`：Length / Angle / Diameter / ClosedArea / Annotation / ClipPlane
  - `TouchController`、`ObjectPicker`、`SceneStateSerializer`、`CommandHistory`
  - `fallback/ProceduralLungModel`（无模型时的程序化肺）
- 后端 `backend/`：Java 17 + Spring Boot + MyBatis，模块 share / plan / result / asset /
  annotation / measurement / audit；存储适配 MinIO / 华为 OSS
- 数据管线 `scripts/`：`model-pipeline`（GLB 校验/多档转换）、`public-data`（MSD 肺 → GLB）
- 路由：`/share/:token`、`/reference`（iframe 原站对照）、`/public-data`

### 3.2 已完成 ✅

- 模型页 UI 外壳基本齐活：`模型/下载` 标签、工具栏（重置/分段/方案/标注/测量/视图）、
  右侧快捷栏（自动旋转/移动/重置/BG）、底部解剖分组条、分层抽屉、方案抽屉、方位指示器
- Three.js 渲染管线可跑通：GLB 分层加载、显隐/颜色/透明度、自动旋转、背景、裁剪、
  测量/标注/剖切工具、状态保存恢复
- 后端分享→manifest 链路 + 存储适配 + 数据管线脚本

### 3.3 实测现状（项目内截图）

- `reference-strip-390.png`：外壳在，但显示「模型资源未加载」——**缺数据时是空态**
- `rebuilt-8088.png`：喂入公开肺数据后**能正确渲染 5 个肺叶分层**（右上叶/右中叶/右下叶/
  左上叶/左下叶 + 体积 ml），说明渲染骨架是对的

### 3.4 未完成 ❌

| 区域 | 现状 |
|---|---|
| 3D 模型数据 | 仅公开肺数据；未接原站“病例→结果→分层”真实链路 |
| 3D 视觉保真 | 材质/光照/色板/背景/初始视角未逐项与原站核对 |
| 2D 影像 | `CtPreview.tsx` 是 **CSS 假图**，无 DICOM 解析 / MPR / 窗宽窗位 / LUT |
| 分段编辑 | `分段` 目前只是“移动图层”，非真正的分割编辑 |
| 切割运算 | 肺/肝/肝段/通用/颅窗切除 全缺 |
| 模树 | 原站的结构树（含报告/评估/标记）未实现，用的是底部条 |
| 血管标记 / AR / 裁剪框视图 | 未实现（对应原站 209/212/213） |
| 平台功能 | 交流 / 我的 / 下载 / 登录 / 扫码分享 未实现 |

---

## 4. 差距矩阵（优先级）

| # | 维度 | 原站 | 当前 | 优先级 |
|---|---|---|---|---|
| 1 | 3D 模型可见 | 私有格式+K8s 签名下载 | GLB 管线（已通） | **P0** |
| 2 | 3D 视觉参数 | 未知，需采样 | 部分对齐（旋转速度已对） | **P0** |
| 3 | 工具栏/视图语义 | 7+2 视图 | 已覆盖 7 个 | **P0** |
| 4 | 交互（单/双指、自动旋转、BG） | 完整 | 基本完整 | **P0** |
| 5 | 真实病例数据链路 | getfileurl 全链 | 缺 | **P1** |
| 6 | 2D DICOM/MPR | dwv + 4 宫格 | CSS 占位 | **P1** |
| 7 | 窗宽窗位/LUT/2D测量 | 完整 | 缺 | **P1** |
| 8 | 分段编辑 | 网格级 | 仅移动 | **P2** |
| 9 | 切割运算 | 5 种 | 缺 | **P2** |
| 10 | 模树/报告/评估 | 完整 | 缺 | **P2** |
| 11 | 血管标记/AR/裁剪框 | 209/212/213 | 缺 | **P3** |
| 12 | 交流/我的/下载/登录 | 完整 | 缺 | **P3** |

---

## 5. 复刻路线图（分阶段可执行）

### P0 — 把“同一个病例看起来/操作起来一样”做到位（1~2 周）

**目标**：给同一个模型，你的查看器与原站在**视觉与操作上难以区分**。

1. **建立“对照复刻”工作台**（最高杠杆）
   - 打开 `/reference`（已在 `.env.local` 配好 iframe 原站），左原站右本地。
   - 用 Playwright 在 390 / 768 / 1440 三档宽度**同时**截原站与本地，逐张 diff。
   - 建议产物：`front/reference-strip-{390,768,1440}.png`（已有雏形）。
   - 建议新增脚本 `scripts/reference/capture.ts`：一档一条对比长图。
2. **逐项对齐 3D 视觉参数**（都在 `ViewerEngine.ts`）：
   - 背景灰 `#d9d9d9`（已对）→ 确认原站深色 BG 值（`BG` 按钮切换的那档颜色）
   - 光照：原站接近**无高光的实体色**，确认是否需要降为 `AmbientLight` 主导 + 弱平行光
   - 材质：是否需要 `flatShading` / `MeshLambert` 以复现原站的“平面块感”
   - 相机：`fov=35`（已用）→ 与 `fitToVisibleLayers` 的边距系数 `0.75` 复核
   - 初始视角：`front`/`up` 的方向与 LPS/RAS 处理（已实现，需肉眼比对）
   - 自动旋转：`0.5°/30ms`（注释已标注为对齐参考）
3. **采样原站色板**：把每个结构（肺段/血管/骨/病灶…）的颜色、透明度抓下来，
   写进 `front/src/api/*.ts` 的 manifest 默认值或 `viewer.store` 默认态。
4. **补全视图映射**：`viewPresentations` 增加 `三维+AR`、`裁剪框` 的显式语义；
   工具栏 `测量/标注` 的子模式（二维标注 / 三维标注）按原站下拉实现。
5. **回归**：`pnpm --dir front test` + `typecheck` + `build` 全绿。

### P1 — 让数据“像真的”（2~3 周）

**目标**：不再依赖硬编码公开数据，能从“病例→结果→分层模型”链路拿到数据。

1. **对齐数据契约**：把原站 `getUploadedResults / loadResult` 的返回结构，
   映射成你后端的 `ViewerManifest`（`share` / `result` / `asset` 模块）。
   - 建议先抓一次**你自己账号/公开 demo** 的接口样本，落成 `docs/api/reference-samples.md`
     （**切勿提交含患者身份信息或签名 URL 的原始数据**）。
2. **模型入库管线**：把 `scripts/model-pipeline` 的 GLB 多档产物接到 `result`/`asset`，
   后端由 `SharedViewerServiceImpl` 下发 manifest。
3. **可选：合规对照**。若确需比对原站真实几何，仅在**本地临时**用 `imagetry` 的
   `/hexaApiServer/__resource` 代理查看，不得落库、不得分发（见第 7 节合规）。

### P2 — 2D 影像与高级功能（3~4 周）

1. **真实 DICOM**：引入解析库（原站用 DWV，你可选 `cornerstone3D` 或自研 Web Worker 解析），
   替换 `CtPreview.tsx`：
   - 横断/冠状/矢状 + 4 宫格 MPR（对应原站 1x1/2x1/3x1/2x2 + MPR）
   - 窗宽窗位 + 9 个预设（骨/肺/腹/脑/软组织/肝/纵膈/卒中/CTA）
   - LUT 色彩表、翻页/移动/缩放/测量/标注
   - 叠加信息：病历号/年龄/性别/序列名/层厚/检查日期/层数/宽位（原站 DOM 已给出字段清单）
2. **分段编辑与切割**：把 `分段` 从“移动”升级为真正的分割编辑；实现
   肺切除/肝切除/肝段切/通用切/颅窗切（可先用 `ClipPlaneTool` + 封盖算法起步）。
3. **模树**：用 `LayerBottomSheet` 扩展为树形（分段/报告/评估/标记）。

### P3 — 平台化与长尾（按需）

- 血管标记（209）、AR（212）、裁剪框（213）视图
- 交流 / 我的 / 下载 标签页、登录、扫码分享（原站 `session/*`、`share/*` 语义）
- 移动端手势细节（原站用 `split.js` 做分屏拖拽）

---

## 6. 需要你拍板的关键决策

| 决策点 | 选项 A | 选项 B | 建议 |
|---|---|---|---|
| 模型数据来源 | 抓原站真实病例（快，但有合规/隐私风险） | 公开数据 + 自有数据重建（慢，但干净） | **B 为主，A 仅本地比对** |
| 模型格式 | 复刻原站私有格式（不现实） | 继续 GLB 多档管线 | **B** |
| 3D 引擎 | 逆向原站 jimGL/renderGL | 继续 three.js 自研 `rendering-core` | **B** |
| 2D 引擎 | 直接用 DWV（与原站一致） | cornerstone3D / 自研 | 看团队熟悉度，DWV 兼容性最稳 |
| 目标保真度 | 像素级 | 行为/视觉级 | **行为/视觉级** |

---

## 7. 合规与隐私（必须遵守）

- 该链接含病例数据（`hidePatient=0`）。**不得抓取、下载、提交、分发患者身份信息**。
- 仅用**合成/公开**数据入库；签名 URL、token、患者数据一律不写进仓库
  （你的 `README.md` 与 `public-datasets.md` 已有此约定，继续保持）。
- `para` / `visitor_token` 属访问凭证，只放本地未提交 env。

---

## 8. 现在就能做的 5 件事（按顺序）

1. 在 `ViewerEngine.ts` 里把光照/材质/背景/初视角与原站逐项核对（配合 `/reference` 截图）。
2. 写 `scripts/reference/capture.ts`，一键出「原站 vs 本地」三档对照长图。
3. 把 `.env.local` 的 `VITE_REFERENCE_VIEWER_URL` 保持仅本地（确认 `.gitignore` 已忽略）。
4. 用 `rebuilt-8088.png` 的肺数据跑通一次 P0 全回归（test/typecheck/build）。
5. 决定第 6 节的“数据来源”，再启动 P1 的数据契约对齐。

---

## 9. 下一步具体修改清单（P0 落地）

> 关键前提：原站的 3D 视觉参数（光照 / 材质 / 背景 / 结构色）都藏在**混淆后的引擎代码**里，
> 且背景色还允许用户自选——**静态分析拿不到精确值，必须“跑起来实测对照”**。
> 所以第一步不是改渲染，而是先建立**对照基线**。

### ✅ 已完成（本次）
- `front/src/styles/global.css`：把散落的品牌蓝统一为原站色 **`#16B6FF`**
  - 替换：`#11b8ef` / `#13b8f2` / `#2f89ee` / `#159bb5` / `#168af1` / `#1cb8e8` / `#13b8ef` → `#16b6ff`
  - 依据：原站 `css/myBarAndButton.css:37`、`css/myTree.css:169,243`、`css/main.css:19-42`
  - 顺带移除文件开头多余的 UTF-8 BOM

### Step 1 · 建立“对照基线”脚本（新建文件）
- 新建 `scripts/reference/capture.mjs`
  - 用 Playwright 分别打开原站（`VITE_REFERENCE_VIEWER_URL`）与本地 `/public-data`
  - 在 **390 / 768 / 1440** 三档宽度各截一张，左右拼接成长图
  - 输出 `front/reference-strip-<width>.png`
- 验收：一条命令产出三张“原站 vs 本地”对照图，作为后续所有视觉修改的判据。

### Step 2 · 3D 视觉参数逐项对齐（改 `front/packages/rendering-core/src/ViewerEngine.ts`）
| 参数 | 当前值 | 待做 |
|---|---|---|
| 背景 | `#d9d9d9` | 与原站 `BG` 两态实测比对 |
| 光照 | `AmbientLight(1.5)` + `DirectionalLight(2.5)` | 原站接近“实体色”，可能需降平行光 |
| 材质 | 默认（有光照渐变） | 确认是否加 `flatShading` 复现平面块感 |
| 相机 | `PerspectiveCamera(35, …)` | 与 `fitToVisibleLayers` 边距系数 `0.75` 复核 |
| 初始视角 | `up` 轴 + LPS/RAS 旋转 | 肉眼比对 |
| 自动旋转 | `0.5°/30ms` | 已按参考站对齐（保留） |

### Step 3 · 消除空态阻塞
- `/share/:token` 在无模型时走 `ProceduralLungModel`（已有），或本地默认入口指向 `/public-data`，
  保证**任何时刻都能看到模型来迭代**，而不是停在“模型资源未加载”。

### Step 4 · 数据契约对齐（P1 起点，改后端）
- 把原站 `getUploadedResults` / `loadResult` 的返回结构映射到
  `backend/.../share/dto/ViewerManifestResponse.java`
  （字段：`resultId, title, unit, coordinateSystem, manifestVersion, permissions, layers[id, parentId, code, name, color, opacity, visible, volumeMl, sortOrder, assets]`）
- 重要认知：**结构颜色来自数据、不是前端写死**——所以“配色对齐”= 数据契约对齐，而非改 CSS。

### Step 5 · 2D 影像立项（P2）
- 替换 `front/src/features/viewer/CtPreview.tsx`（当前为纯 CSS 假图）→ 真 DICOM 解析 + MPR + 窗宽窗位 + LUT。

## 10. 首次对照实测发现（2026-09-11）

工具：`node scripts/reference/capture.mjs`（本地用 `vite preview` 提供构建产物），
输出 `front/reference-strip-{390,768,1440}.png`；原站三档均成功对照。

### 已量化的差异（按可改性排序）

| # | 差异 | 原站 | 本地 | 类型 |
|---|---|---|---|---|
| 1 | **模型完整度** | 肺叶 + **气管树** + **动脉/静脉**，细解剖多层 | 仅肺叶，低分辨率、明显体素台阶 | 数据 P1 |
| 2 | **底部结构条数值** | 真实分层与体积 | **写死**：`FixedAnatomyStrip.referenceLayers`（肺 3557.92ml / 动脉 99.14ml / 静脉 128.45ml / 气管 45.89ml / 占位_安全边界 15·20mm） | 逻辑 P0 |
| 3 | 右侧快捷栏 | 3 个：自动旋转 / 移动 / BG | 4–5 个，图标与顺序不同 | UI P0 |
| 4 | 工具栏图标 | 6 个统一线性图标 | 图形/风格不一致（方案·标注·视图差异最大） | UI P0 |
| 5 | 标注入口 | 右下角蓝色铅笔 FAB | 无 | UI P0 |
| 6 | 朝向人形 | 位置与大小 | 略偏移 | UI P0 |
| 7 | 3D 背景灰 | 中灰 | 中灰（已接近） | — |

### 结论
- P0 的 UI 对齐从“凭感觉”变成“有据可依”，差异已量化到具体组件；
- 但**最大的观感差距来自数据**（缺气管/血管层）：即便 UI 完全对齐，只有两层肺叶也复现不出原站观感
  → P1（数据）的优先级实际上应该**提前**，与 P0 并行。

## 11. UI 对齐执行结果（第二轮，已完成）

对应第 10 节差异表中的 **2 / 3 / 4 / 5 / 6** 项。

| # | 项 | 处理 | 落地文件 |
|---|---|---|---|
| 3 | 快捷栏 | 改为 **播放/暂停 + 移动 + BG(文字)** 三键，去掉多余的重置键；旋转中按钮转红 | `QuickActionRail.tsx`、`global.css` |
| 4 | 工具栏图标 | 按原站重绘 6 个 SVG：立方体+循环箭头 / 分段球体 / 文档 / 对话气泡 / 三角尺 / 立体框+镜头 | `ViewerIcon.tsx` |
| 4b | 工具栏尺寸 | 按钮 44×52、间距 14、居中；修掉 `@media(max-width:600px)` 里把按钮放大到 56px 造成的横向溢出 | `global.css` |
| 5 | 标注入口 | 新增右下角蓝色铅笔 FAB（进入标注模式） | `ViewerShell.tsx`、`global.css` |
| 6 | 朝向人形 | 尺寸 64×120 → 47×88，位置对齐原站 | `global.css` |
| 2 | **底栏数据驱动** | 删除写死的 8 条（肺 3557.92ml / 动脉 99.14ml …）；改为从 manifest 派生：按参考分类排序、体积求和、颜色取数据；数据只有肺叶时回落到解剖分组 | `stripItems.ts`(新)、`FixedAnatomyStrip.tsx`、`referenceCategory.ts` |
| 2b | 真实体积 | 读取 TotalSegmentator `statistics.json`（mm³ → ml），让底栏显示真实数值 | `publicDataset.ts` |

同时给对照脚本补了**主题与配色方案锁定**（原站会跟随 `prefers-color-scheme` 变深色，不加锁会导致前后截图不可比）。

**验证**：typecheck ✓ ｜ lint ✓（1 条既有 warning）｜ build ✓ ｜ 63 个测试 ✓；三档对照图已生成。

**仍未解决（属 P1 数据）**：模型只有肺叶，**缺气管与血管**——这是当前观感差距的主因。

## 12. 数据层落地：气管 / 动脉 / 静脉（已完成）

补上第 10 节里“最大的观感差距来自数据”那一条。

| 项 | 结果 |
|---|---|
| 分割任务 | TotalSegmentator `lung_vessels`（4 类：`lung_airways` / `lung_airways_wall` / `lung_arteries` / `lung_veins`） |
| 新增分层 | **气管 61.92ml**、**肺动脉 199.27ml**、**肺静脉 210.49ml**（真实体积） |
| 观感变化 | 从“2 个纯色块”变为「肺叶 + 气管树 + 动/静脉血管」，底栏与参考站同为 肺 / 动脉 / 静脉 / 气管 四类 |

### 改动
- `scripts/public-data/import-msd-lung.ps1`
  - 新增 `-Tasks`（`total` / `lung_vessels`），一个任务一个目录
  - 改为**直连 `TotalSegmentator.exe`**并局部放开 `$ErrorActionPreference`：
    `run.ps1` 里的 `Stop` 会把 TotalSegmentator 的 stderr 进度输出当成致命错误，直接中断分割
- `scripts/public-data/build-msd-lung-glb.py`
  - `--mask-root` 支持多任务目录；可选 mask 缺失时跳过而不是报错（只跑肺叶也能出 manifest）
  - **体积改为按 mask 体素计算**：TotalSegmentator 对气道两类会写出 `volume: 0`，照抄会让查看器显示 0.00ml
  - 新增窗式 sinc 平滑（`vtkWindowedSincPolyDataFilter`），消除 marching cubes 的体素台阶
  - 肺叶透明度 0.82 → 0.72，让血管能透过肺叶看到
- `docs/public-datasets.md`：更新命令（`-TotalSegmentatorHome`、`--mask-root`）与原因说明

### 尚未做
- **肺段级分割**：参考站是多色肺段，TotalSegmentator 没有肺段模型，需要另找方案或接受肺叶粒度

### 环境坑（本机）
- **D 盘不支持回收站**，本机的安全删除保护因此失败 → 无法删除大目录/大文件，
  `pnpm build` 清理 `dist` 会直接报错。绕过办法：`mv dist dist.stale` 后再构建
  （`dist.stale` 已加入 `.gitignore`，但需要手动删除）。
- `pwsh`（PowerShell 7）未安装，只有 Windows PowerShell 5.1。

---

## 13. P2 落地：真实 2D 影像（已完成）

`CtPreview.tsx` 的纯 CSS 假图已删除，换成**真正按 HU 值渲染的 MPR 影像**。

### 数据
- 公开数据路径没有 DICOM，只有 NIfTI → 新增 `scripts/public-data/build-ct-volume.py`：
  把 NIfTI 重定向到 RAS、按块平均降采样为 **256×256×152 int16**（19MB），
  写出 `volume.bin` + `ct-volume.json`（dims / spacing / HU 范围 / 默认窗 / 非身份化元数据）
- 元数据刻意**不编造患者信息**（年龄/性别留空，序列名标注「公开演示数据」）

### 前端（`front/src/features/viewer/ct/`）

| 文件 | 作用 |
|---|---|
| `ctVolume.ts` | 描述文件 + int16 载荷的加载与校验，带会话级缓存（19MB 只拉一次） |
| `ctSlice.ts` | 轴/冠/矢三向 MPR 抽取，含显示方向翻转（轴位前在上、患者右在观察者左） |
| `ctWindow.ts` | DICOM 线性窗函数（PS3.3 C.11.2.1.2） |
| `ctPresets.ts` | **10 项宽位菜单，数值取自原站**（骨/肺/腹/脑/软组织/肝/纵膈/卒中/CTA + 重置） |
| `ctLut.ts` | 8 张色彩表（plain / invPlain / rainbow / hot / hot_iron / pet / hot_metal_blue / pet_20step） |
| `CtCell.tsx` | 单格 canvas：按物理尺寸等比适配、缩放/平移、滚轮翻页、拖拽调窗/翻页/移动/缩放、四角信息 |
| `CtViewer.tsx` | 工具栏（报告/翻页/移动/缩放/调窗/宽位/布局/测量/标注/Lut/信息）、1×1/2×1/3×1/2×2 布局、切片条、信息面板 |

- `ViewerManifest` 新增可选 `volume: { descriptorUrl }`；公开数据流程从首个资源目录推导
- 分享路径：后端 manifest 只要带上同样的 `volume` 字段即可复用，前端无需改动

### 验证
- 单测 85 个全绿（新增 22 个：窗函数、MPR 抽取与方向、LUT、体数据校验、工具栏/布局/宽位切换）
- 实测截图 `front/reference-ct-390.png`（轴位 + 肺窗）与 `front/reference-ct-mpr-390.png`（三平面 MPR）
- 方向自检：轴位**脊柱在下方、前胸在上**，符合阅片惯例

### 13.1 2D 测量 / 标注 / 报告（P2 收尾）
之前置灰的三个按钮全部接通：
- **测量**：进入测量模式后在切片上点两点，按 `columnSpacing/rowSpacing` 算长度（mm），
  显示黄色线 + 红色端点 + 中点长度标签。锚定到（plane, sliceIndex），切走再回来还在
- **标注**：进入标注模式后点位置，弹出文字输入框 → 输入 + Enter 保存为带文字的标记点
- **报告**：底部报告面板列出所有测量与标注（平面、第几张、长度/文字），一目了然
- 测量子工具栏：`新建 / 撤销 / 清空 / 关闭`（参考原站工具栏）
- 新模块 `ctMeasure.ts`：纯几何函数（距离、坐标变换、长度格式化），8 个单测覆盖

### 13.2 补全 2D 测量工具集：长度 + 直径 + 角度 + 面积
原站 2D 测量四种工具一应俱全，现在全部接通。模型由 `CtMeasurement`（仅长度）升级成 `CtMeasure`：
- **长度**（length）：2 点，最常用
- **直径**（diameter）：2 点，画线 + **穿过两端点的圆**，典型用于量病灶
- **角度**（angle）：3 点（**第一点是顶点**），画两条臂 + 弧 + 角度标签
- **面积**（area）：≥3 点围成多边形，回到起点或双击同一点闭合，Shoelace 算面积（mm² / 自动转 cm²）
- 子工具栏：4 个工具按钮 + 撤销/清空/关闭，每个工具切换有对应 hint
- 报告：按类型分组列出（长度/直径/角度/面积 各自带正确单位）

### 13.3 关键坑
- jsdom 同步 PointerEvent 不填 offsetX + doubleClick 误触发 → 用 `clientX-rect.left` + 同点判定
- 预览计算在角度 1 点时越界（`points[2]` 为空）→ 按类型设最小点数守卫
- 4 种工具的 `value` 按物理间距计算，**单位一致用 `columnSpacing/rowSpacing`**，从切片坐标到 mm 不走样

### 验证
- 单测 **97 个全绿**（新增 4 个：角度 90°/180°、面积 100mm²/400mm²、单位格式化、4 种测量端到端）
- 实测截图 `front/reference-ct-measure-kinds-390.png`（4 种同时展示）

### 肺段分割：诚实标注
- TotalSegmentator 没有 `lung_segments` 任务（只有 `liver_segments`），手头也没有肺段标注数据
- **不可行**：硬做就是造假（无训练数据 + 无模型）
- 折中：现有 5 叶颜色 + 气管 + 动/静脉已和原站结构性接近，剩下是数据丰富度，不是 UI/算法问题

### 13.1 的坑（前面）
- jsdom 的合成 PointerEvent **不填充 offsetX**——改用 `clientX - rect.left`，测试与浏览器都对
- 标注输入框被点击后立刻 blur 而被丢弃——`preventDefault` 阻止焦点抢夺 + 空内容 blur 不销毁
- 11 个按钮 + 390px 屏会**把「报告」横向滚出屏幕**——改 `flex-wrap: wrap`，窄屏换行而非滚动
- 工具/标注状态带 `plane/sliceIndex` 上下文，切片切换时自然失效，避免 effect 同步 setState

### 尚未实现（诚实标注）
- 2D **直径 / 角度**等测量工具未做（参考站有，先做最常用的长度+文字标注）
- 体数据是降采样的（1.39×1.39×2.0mm），放大到很深时会看出插值痕迹

---

## 附：一页纸速览

- **原站** = 模板化布局(`layout/*.txt`) + 闭源自研 3D 引擎(`jimGL/renderGL/jimDat`) + `hexaApiServer` 接口 + 华为云 OBS 签名资源
- **你** = React/three.js/自研 rendering-core + Spring Boot + GLB 管线（架构更现代、可维护）
- **策略** = 不抄引擎，抄“行为与视觉”；数据用公开/自有；先 P0 视觉对齐，再 P1 数据、P2 2D/高级
- **唯一硬门槛** = 2D DICOM/MPR 与高级分割切割，工作量最大，建议单独立项
