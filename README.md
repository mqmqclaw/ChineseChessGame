# 中国象棋 - 人机对弈

基于 Web Canvas 的中国象棋游戏，支持电脑和手机浏览器，可与 AI 对战。

## 快速开始

启动本地服务器（需要 Python 3）：

```bash
python3 -m http.server 8080
```

然后在浏览器中打开 `http://localhost:8080`。

## 功能

- **完整棋规**：支持所有棋子走法、将军检测、飞将规则、绝杀判定
- **AI 对手**：基于 Negamax + Alpha-Beta 剪枝搜索算法
- **三档难度**：简单（2层）、中等（3层）、困难（4层）
- **悔棋功能**：一次撤回玩家和 AI 各一步
- **响应式设计**：自适应电脑和手机屏幕
- **操作简便**：点击选棋 → 绿点标记可走位 → 点击落子

## 技术栈

- 纯 HTML5 / CSS3 / ES Module JavaScript
- Canvas 2D 渲染，支持 Retina/HiDPI 显示
- 零依赖，无需构建工具

## 项目结构

```
index.html          主页面
css/style.css       界面样式
js/game.js          棋盘状态与规则引擎
js/ai.js            AI 搜索与评估
js/renderer.js      Canvas 渲染
js/app.js           应用控制器
```
