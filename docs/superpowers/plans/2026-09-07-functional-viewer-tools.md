# 可操作三维工具实现计划

**Goal:** 把现有规格中的三维工具接到已加载 GLB，提供真实取点、测量、标注、分层移动、裁剪和方案恢复。

**Architecture:** 保留 React / Three.js。新增独立交互控制器管理射线拾取、三维记录、撤销及绘制；ViewerEngine 提供模型与相机桥接；React 面板订阅记录变化。方案按 resultId 和 manifestVersion 存储在当前浏览器，完整保存相机、模型变换、图层、记录和裁剪。没有 CT 数据时显示数据缺失状态。

**Tech Stack:** TypeScript, React, Three.js, Vitest, Playwright.

- [ ] 为真实点位测量、撤销恢复和数据校验添加失败测试。
- [ ] 新建 tools/InteractiveTools.ts：拾取可见模型表面，使用对象局部坐标保存锚点，长度/直径两点、角度三点、多边形手动完成，三维线段及标签。
- [ ] 扩展 ViewerEngine.ts：交互控制器、图层移动、裁剪、相机及状态存取，清理资源。
- [ ] 新建 ToolPanel.tsx，更新 ViewerShell.tsx / ViewerCanvas.tsx：输入、撤销、清空、完成、图层编辑以及权限限制；切换视图时保留引擎。
- [ ] 更新 PlanDrawer.tsx：命名、保存、恢复、更新和删除本地方案，存储失败可见。
- [ ] 更新视图菜单及 CtPreview.tsx：标准视角、裁剪框，缺少 CT/AR 能力的选项明确反馈。
- [ ] 执行单元测试、typecheck、lint、build，以及真实 WebGL 浏览器操作验证。

验收：点击背景不能产生记录；旋转缩放不改变毫米测量；隐藏图层不参与拾取；撤销和清空作用于当前工具记录；关闭工具恢复旋转；刷新后方案可恢复；已有未提交改动保留。
