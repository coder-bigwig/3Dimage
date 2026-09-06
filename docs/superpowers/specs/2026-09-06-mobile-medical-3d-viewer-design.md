# 移动医学 3D 分享查看器设计规格

## 1. 文档目的

本文定义第一版移动医学 3D 分享查看器的需求边界、系统架构、前端组件、后端模块、数据模型、API、文件流水线、性能策略、异常处理和最低测试要求。本文是后续工程骨架与实现计划的唯一设计基线。

## 2. 第一版目标

第一版复刻参考分享链接打开后的 3D 查看器页面及其工具，优先支持手机浏览器。第一版必须先建立可运行、可维护的前后端分离工程框架，再按工具逐项实现查看器功能。

第一版包含：

- 分享链接进入、令牌校验、过期与错误页面。
- 分层医学模型加载和显示。
- 单指旋转、双指缩放、双指平移与对象选取。
- 图层显隐、透明度、颜色和独显。
- 单层拖动、分离、闭合与复位。
- 长度、直径、角度与闭合区域测量。
- 三维锚点标注。
- 裁剪面与裁剪操作。
- 标准视角、自动旋转、背景切换、全屏和截图。
- 撤销、重做、清空、关闭工具。
- 查看方案的保存、恢复、更新和删除。
- MinIO 与阿里云 OSS 可配置切换。
- GLB、STL、OBJ 输入的标准化和手机优化产物设计。

第一版不包含：

- 登录、注册和完整用户中心。
- 病例列表与模型上传管理后台界面。
- 聊天、报告和下载中心。
- 二维 DICOM 查看器。
- DICOM 自动分割、AI 识别和医学三维重建。
- 多人实时协作和多租户管理。
- 完整自动化测试覆盖和全量真机矩阵。

开发阶段通过数据库迁移、种子数据或管理脚本创建分享记录、模型清单和演示方案。

## 3. 技术基线

### 3.1 前端

- React
- TypeScript
- Three.js
- Vite
- Zustand，用于低频界面状态和工具模式状态。
- TanStack Query，用于服务端数据缓存与请求状态。
- Vitest，用于最低限度的单元测试。
- Playwright，用于分享链接端到端冒烟测试。

### 3.2 后端

- Java 17
- Spring Boot 4.0.8
- Spring Security
- MyBatis 4.0.1
- Maven
- Flyway
- OpenAPI/Swagger
- PostgreSQL
- Redis

### 3.3 存储与部署

- 文件存储由统一 `StorageService` 抽象。
- 开发或私有化部署可使用 MinIO。
- 公有云部署可使用阿里云 OSS。
- 数据库只保存存储提供商、Bucket 和 Object Key，不保存永久公网 URL。
- 生产文件通过短期签名 URL 下载。
- 使用 Docker 构建前端和后端镜像，Nginx 提供静态文件、HTTPS终止和 API 反向代理。
- 医学处理能力后续以独立 Python Worker 增加，不进入 Java 主进程。

## 4. 工程组织

项目采用一个 Git 仓库，根目录明确分离前端与后端。二者分别构建、测试和部署。

```text
project/
├── front/
├── backend/
├── docs/
├── deploy/
├── scripts/
├── .gitignore
└── README.md
```

前端核心目录：

```text
front/
├── public/
├── src/
│   ├── app/
│   ├── pages/
│   ├── features/viewer/
│   ├── components/
│   ├── stores/
│   ├── api/
│   ├── types/
│   ├── styles/
│   └── main.tsx
├── packages/rendering-core/
│   ├── engine/
│   ├── loaders/
│   ├── interaction/
│   ├── layers/
│   ├── tools/
│   ├── commands/
│   ├── resources/
│   └── performance/
└── tests/
```

`rendering-core` 不依赖 React、Java API 或数据库。React 通过稳定命令接口调用渲染内核，高频相机、指针和渲染循环状态留在内核中，避免触摸操作触发 React 高频重渲染。

后端按业务模块划分，每个模块内部使用分层结构：

```text
backend/src/main/java/com/example/medical3d/
├── common/
├── modules/
│   ├── share/
│   ├── result/
│   ├── asset/
│   ├── plan/
│   ├── measurement/
│   ├── annotation/
│   └── audit/
└── infrastructure/
    ├── storage/
    ├── cache/
    └── persistence/
```

模块内部固定调用链：

```text
Controller → Service → ServiceImpl → Mapper → Mapper XML → PostgreSQL
```

Controller 只处理 HTTP、参数校验和响应映射；ServiceImpl 负责事务与业务规则；Mapper 只负责持久化。

## 5. 系统运行架构

访问流程：

```text
用户打开 /share/{token}
        ↓
Java 后端验证令牌哈希、有效期、撤销状态和工具权限
        ↓
后端记录访问审计并返回 Viewer Manifest
        ↓
后端通过 StorageService 生成 MinIO/OSS 短期签名 URL
        ↓
手机前端直接从对象存储加载分层 GLB
        ↓
Three.js 渲染并执行查看、测量、标注和裁剪
        ↓
用户按权限保存查看方案、测量与标注
```

模型文件不经过 Java API 转发，以避免带宽、内存和连接占用。Java API 负责权限与元数据，对象存储负责大文件传输。

## 6. 手机页面与组件

页面保持参考链接的空间结构：顶部上下文工具栏、中央全屏 3D 画布、左上方向指示器、右侧快捷栏和底部双层数据栏。

```text
ViewerPage
├── ShareGate
│   ├── LoadingState
│   ├── ExpiredState
│   └── ErrorState
└── ViewerShell
    ├── ViewerCanvas
    │   ├── RenderingCore
    │   └── MeasurementOverlay
    ├── ContextToolbar
    ├── QuickActionRail
    ├── OrientationWidget
    ├── MeasurementStrip
    ├── AnatomyGroupStrip
    ├── LayerBottomSheet
    ├── PlanDrawer
    ├── ConfirmDialog
    └── ToastRegion
```

### 6.1 模式化工具栏

顶部工具栏不是固定按钮集合，而是根据当前模式生成：

- 默认浏览：复位、分段、方案、标注、测量、视图。
- 测量：新建、撤销、清空、闭合、长度、直径、角度、关闭。
- 标注：新建、编辑、删除、撤销、清空、关闭。
- 单层拖动：撤销、重做、复位、闭合、关闭。
- 裁剪：新增面、翻转、撤销、清空、关闭。

### 6.2 工具状态机

前端状态包含：

```text
mode: browse | measure | annotate | moveLayer | clip
activeTool: none | length | diameter | angle | closedArea | label | clipPlane
selectedLayerId: string | null
selectedRecordId: string | null
undoStack: Command[]
redoStack: Command[]
```

任何时刻最多允许一个独占工具激活。模型修改通过 Command 模式执行，统一支持撤销、重做、清空和方案序列化。撤销栈按当前方案隔离，不跨方案复用。

### 6.3 触摸规则

- 浏览模式：单指旋转，双指缩放与平移。
- 单层拖动模式：单指移动选中图层，不旋转场景。
- 测量模式：点击模型表面创建控制点，拖动控制点更新测量。
- 标注模式：点击模型表面创建锚点，屏幕空间标签保持与锚点关联。
- 裁剪模式：手势移动或旋转裁剪面。
- 横屏复用相同业务组件，底部面板移动为右侧抽屉。

## 7. 模型格式与文件流水线

系统允许接收 GLB、STL 和 OBJ。OBJ 及其 MTL、纹理必须作为受控 ZIP 包提交。系统内部以 GLB 为标准格式，手机端只加载经过验证和优化的 GLB。

产物分层：

```text
original/        原始 GLB、STL 或 OBJ ZIP，不可变
canonical/       高精度标准 GLB，作为转换与精度基准
web/high/        高质量手机展示模型
web/medium/      默认手机展示模型
web/low/         低性能设备和快速首屏模型
reports/         转换参数、误差、三角面和包围盒报告
thumbnails/      WebP 缩略图
```

转换顺序：

```text
安全校验 → 解压隔离 → 单位与坐标标准化 → 层级与材质映射
→ canonical GLB → LOD/压缩 → 误差检查 → Manifest → 发布
```

必须记录源单位、目标单位、源坐标系、目标坐标系、转换矩阵、转换工具版本、参数、校验和和误差报告。医学测量不得把经过激进网格简化的低精度模型作为唯一依据。

基础模型转换在第一版通过隔离的转换任务或受控脚本提供；DICOM 分割和 AI 重建留给后续 Python Worker。

## 8. 数据模型

核心实体：

### 8.1 case_result

表示一个可分享查看的三维重建结果。主要字段为 `id`、`case_code`、`title`、`unit`、`coordinate_system`、`manifest_version`、`status`、`created_at` 和 `updated_at`。

### 8.2 model_layer

表示一个分层模型节点。主要字段为 `id`、`result_id`、`parent_id`、`code`、`name`、`default_color`、`default_opacity`、`default_visible`、`volume_ml`、`sort_order` 和 `base_transform JSONB`。

### 8.3 model_asset

表示存储中的一个模型产物。主要字段为 `id`、`result_id`、`layer_id`、`variant`、`provider`、`bucket`、`object_key`、`format`、`compression`、`size_bytes`、`triangle_count`、`checksum`、`version` 和 `status`。

### 8.4 viewer_share

表示分享授权。主要字段为 `id`、`result_id`、`token_hash`、`permissions JSONB`、`expires_at`、`revoked_at` 和 `created_at`。数据库不保存明文分享令牌。

### 8.5 viewer_plan

表示可恢复的场景方案。主要字段为 `id`、`result_id`、`name`、`scene_state JSONB`、`version`、`created_at` 和 `updated_at`。更新使用乐观锁，版本不一致返回 HTTP 409。

### 8.6 measurement 与 annotation

测量和标注分别保存，均关联 `plan_id` 与可选 `layer_id`。几何坐标保存于 JSONB，样式与显示设置保存于 JSONB；每条记录包含版本和时间戳。

### 8.7 audit_log

记录分享访问、Manifest 读取、方案修改和受保护操作。IP 只保存经过策略处理的哈希或脱敏值。日志不得保存分享令牌、患者姓名、存储密钥和完整签名 URL。

## 9. Viewer Manifest

Manifest 是前端加载一次即可获得的查看器契约，至少包含：

- 结果标识、单位、坐标系和 Manifest 版本。
- 分享者拥有的 view、measure、annotate、savePlan 和 download 权限。
- 模型图层树、默认颜色、透明度、显隐和体积。
- 每层 high、medium、low 资源地址与资源元数据。
- 查看器可用工具配置和默认视角。

前端必须在加载模型前验证 Manifest 结构。未知字段允许忽略，以支持后端向后兼容扩展；缺少必需字段时停止加载并显示模型不可用状态。

## 10. REST API

API 前缀为 `/api/v1`：

- `GET /shared-viewers/{token}/manifest`：验证分享并返回 Manifest 与短期签名资源。
- `GET /shared-viewers/{token}/plans`：读取可访问方案。
- `POST /shared-viewers/{token}/plans`：创建方案。
- `PUT /shared-viewers/{token}/plans/{planId}`：按版本更新方案。
- `DELETE /shared-viewers/{token}/plans/{planId}`：按权限删除方案。
- `POST /shared-viewers/{token}/events`：批量保存测量、标注和必要审计事件。
- `GET /actuator/health`：容器健康检查。

接口使用统一错误响应，包含 `code`、`message`、`requestId` 和可选 `details`。接口契约以 OpenAPI 为准，前端 TypeScript 请求与响应类型从 OpenAPI 生成。

## 11. 存储抽象

业务模块只依赖以下抽象，不直接依赖厂商 SDK：

```java
public interface StorageService {
    UploadResult upload(UploadCommand command);
    String createSignedDownloadUrl(String objectKey, Duration validity);
    void delete(String objectKey);
    boolean exists(String objectKey);
}
```

实现包括 `MinioStorageService` 与 `OssStorageService`。通过 `storage.provider=minio|oss` 切换。生产密钥只通过环境变量或密钥管理系统提供。

## 12. 手机性能与降级

第一版使用以下可配置初始基线：

- 首批必要模型下载目标不超过 30 MB。
- 默认活动三角面预算约 150 万，根据设备能力调整。
- 目标帧率为 30 FPS；持续低于 24 FPS 时降低像素比或切换更低 LOD。
- 设备像素比上限为 2；交互期间允许临时降低渲染比例。
- 隐藏图层延迟加载，必要图层优先加载 low 或 medium，再按需升级。
- 模型切换和页面销毁时显式释放 Geometry、Material、Texture 和渲染目标。
- 支持取消下载、有限次数重试、进度反馈和单层加载失败容错。
- WebGL 上下文丢失时暂停交互并尝试一次恢复；失败后提示刷新或更换设备。

上述数字在取得真实医学模型和目标手机后通过性能测试调整，不作为医学精度标准。

## 13. 异常处理

- HTTP 400：参数错误，显示可理解提示并记录 requestId。
- HTTP 403：工具无权限，禁用操作并说明原因。
- HTTP 404：分享不存在，显示链接无效页。
- HTTP 409：方案版本冲突，允许刷新或另存。
- HTTP 410：分享过期或撤销，显示链接失效页。
- HTTP 422：Manifest 或模型不合法，显示模型不可用页。
- HTTP 429：请求过快，短暂等待后重试。
- HTTP 503：后端或存储异常，保留页面状态并允许重试。
- 单个模型图层加载失败时，其他图层继续显示，并在图层列表标记错误。

每次请求生成 requestId，前端错误、Java 日志、审计记录和存储操作通过该值关联。

## 14. 安全要求

- 分享令牌使用高熵随机值，数据库只保存安全哈希。
- 分享记录支持到期、撤销和操作级权限。
- 对象文件使用短期签名 URL，禁止永久公开 Bucket。
- 前端不能通过修改 layerId、planId 或 resultId 越权访问其他结果。
- 所有上传文件限制大小、数量、扩展名、实际文件类型、解压后总体积、三角面、纹理尺寸和转换时间。
- ZIP 必须防止路径穿越与解压炸弹。
- 转换任务在资源受限的隔离进程或容器执行。
- 患者信息默认脱敏；第一版演示数据不得包含未经授权的真实患者身份信息。
- CORS 只允许配置的前端来源。
- 生产环境强制 HTTPS，并配置常用安全响应头。

## 15. 最低测试与质量门槛

第一版不要求高覆盖率，但以下检查必须存在并可自动运行：

- 前端 TypeScript 类型检查、ESLint 和生产构建。
- Manifest 解析、坐标转换、距离计算和 Command 撤销栈单元测试。
- 后端应用启动、分享令牌校验、Manifest 查询和存储签名接口冒烟测试。
- MyBatis 核心 Mapper 集成测试。
- 一条有效分享链接能够显示模型的端到端测试。
- 一条过期分享链接被拒绝的端到端测试。

后续增加全量真机矩阵、视觉回归、高覆盖率测试、性能压测和灾难恢复演练。

## 16. 第一版验收条件

第一版完成需同时满足：

1. `front` 与 `backend` 可分别构建和部署。
2. PostgreSQL、Redis 与 MinIO/OSS 通过配置接入。
3. 有效分享链接能够加载一个真实的分层 GLB 案例。
4. 参考链接查看器的已列工具均可在手机触摸环境执行。
5. 图层显隐、颜色、透明度、拖动和分离可保存到方案并恢复。
6. 测量、标注和裁剪操作能撤销、清空并按权限保存。
7. 过期、撤销、无权限、资源失败和 WebGL 不支持均有明确反馈。
8. 切换或退出查看器后 GPU 资源得到释放。
9. 最低测试与构建检查通过。
10. README 包含本地运行、配置、演示数据和部署说明。

## 17. 演进边界

后续功能通过独立模块加入：上传管理后台、账户与组织、二维 DICOM、报告、聊天、多人协作、Python 医学处理服务和多租户。现有 Viewer Manifest 和 REST API 通过版本号保持兼容，避免破坏第一版查看器。
