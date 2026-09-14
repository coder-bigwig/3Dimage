# 标注工具栏字号对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将第一张图标注工具栏的小标签字号与第二张图主工具栏统一为 `12px`，并验证前端构建。

**Architecture:** 只修改标注工具栏的 CSS 选择器，不改变 React 结构、交互或布局。

**Tech Stack:** React、TypeScript、Vite、CSS、Vitest。

---

### Task 1: 对齐标注工具栏标签字号并验证

**Files:**
- Modify: `front/src/features/viewer/annotations/annotations.css:6`
- Test: 现有前端测试套件（无新增运行时行为）

- [ ] **Step 1: Write the failing test**

纯 CSS 字号调整不新增可独立断言的运行时行为；使用现有标注工具栏测试作为回归验证入口。

- [ ] **Step 2: Apply the minimal CSS change**

将：

```css
.annotation-toolbar-row > button small { display: block; font-size: 14px; }
```

改为：

```css
.annotation-toolbar-row > button small { display: block; font-size: 12px; }
```

- [ ] **Step 3: Run the frontend tests**

Run: `npm run test -- --run`

Expected: Vitest exits with code 0 and reports no failed tests.

- [ ] **Step 4: Rebuild the frontend**

Run: `npm run build`

Expected: Vite exits with code 0 and produces the frontend build output.

- [ ] **Step 5: Confirm the diff is scoped**

Run: `git diff -- front/src/features/viewer/annotations/annotations.css`

Expected: The only source change is `font-size: 14px` to `font-size: 12px` in the annotation toolbar label rule.
