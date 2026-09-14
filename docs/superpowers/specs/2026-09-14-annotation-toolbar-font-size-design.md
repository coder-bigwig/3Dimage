# 标注工具栏字号对齐设计

## 目标

将标注工具栏（第一张图）中“调色、工具、撤销、发送”等按钮的小标签字号，与查看器主工具栏（第二张图）的标签字号统一。

## 方案

仅修改 `front/src/features/viewer/annotations/annotations.css` 中 `.annotation-toolbar-row > button small` 的 `font-size`：从 `14px` 调整为 `12px`，与 `.context-toolbar > .context-toolbar__item > button small` 保持一致。

不调整按钮尺寸、图标、间距、颜色、响应式规则或“清空/关闭”等无 `small` 标签按钮的字号。

## 验证

- 检查 CSS 差异仅包含上述字号变更。
- 运行前端测试，确认现有标注工具栏行为不受影响。
