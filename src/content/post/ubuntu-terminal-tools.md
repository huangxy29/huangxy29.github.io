---
title: "Ubuntu终端工具"
description: "用于记录当前ubuntu桌面的终端工具"
publishDate: "08 December 2025"
tags: ["ubuntu", "terminal", "tool"]
---

本文档总结了一套基于 **Rust 生态** 的高性能终端环境配置方案。这套组合主打：**极速渲染**、**开箱即用**、**现代化交互**与**视觉美观**。

---

## 1 工具架构 (The Stack)

| 组件层级 | 工具名称 | 核心作用 | 选择理由 |
| :--- | :--- | :--- | :--- |
| **GUI 终端** | **Alacritty** | 渲染器 (显示) | GPU 加速，极简主义，响应极快，资源占用低。 |
| **会话管理** | **Zellij** | **窗口/多任务** | Rust 编写，替代 Tmux。自带布局引擎与状态栏，无需记忆复杂快捷键。 |
| **Shell** | **Zsh** | 交互核心 | 强大的脚本兼容性，配合 Oh My Zsh 使用。 |
| **主题框架** | **OMZ + P10k** | 提示符 UI | 极速启动，美观，智能显示 Git/K8s/Python 环境。 |
| **字体支持** | **Hack Nerd Font** | 视觉基础 | 完美支持代码符号、文件图标及 Zellij 的 UI 界面。 |

---

## 2 安装与配置步骤

请按顺序执行以下步骤，以避免依赖问题。

### 2.1 安装 Hack Nerd Font (视觉基础)
这是为了解决 Neovim、Zellij 和 P10k 的图标乱码问题。

```bash
# 1. 创建字体目录并下载
mkdir -p ~/.local/share/fonts && cd ~/.local/share/fonts
wget [https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/Hack.zip](https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/Hack.zip)

# 2. 解压并清理
unzip -o Hack.zip && rm Hack.zip

# 3. 刷新系统字体缓存
fc-cache -fv

# 4. 验证 (确认输出包含 Hack Nerd Font)
fc-list : family | grep "Hack"
```

### 2.2 安装 Alacritty 并配置
配置 Alacritty 使用 GPU 渲染并加载 Hack 字体。

1. 安装

[本地编译安装](https://github.com/alacritty/alacritty/blob/master/INSTALL.md)


2. 配置文件 编辑 ~/.config/alacritty/alacritty.toml，填入以下内容：

```toml
[font]
size = 13.0

[font.normal]
family = "Hack Nerd Font"
style = "Regular"

[font.bold]
family = "Hack Nerd Font"
style = "Bold"

[font.italic]
family = "Hack Nerd Font"
style = "Italic"

# 微调：解决某些 Nerd Font 图标显示不全的问题
[font.offset]
x = 0
y = 1

# 可选：让 Alacritty 启动时直接运行 Zellij
# [terminal.shell]
# program = "zellij"
```

### 2.3 部署 Zsh + Oh My Zsh + P10k (智能交互)
1. 安装基础组件

```bash
sudo apt install zsh git curl -y
# 设置 Zsh 为默认 Shell (需注销重登生效)
chsh -s $(which zsh)
```

2. 安装 Oh My Zsh 框架

```bash
sh -c "$(curl -fsSL [https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh](https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh))"
```

3. 安装 Powerlevel10k 主题

```bash
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
```

4. 配置 Zsh 使用 Powerlevel10k 主题

编辑 ~/.zshrc 文件，将 ZSH_THEME 设置为 powerlevel10k/powerlevel10k：

```bash
ZSH_THEME="powerlevel10k/powerlevel10k"
```
保存后运行 source ~/.zshrc，根据 P10k 向导配置视觉风格。

### 2.4 安装 Zellij (会话管理)
1. 安装

[使用二进制安装](https://zellij.dev/documentation/installation.html#binary-download)

## 3 工作流

启动流程

1. 打开 Alacritty。
2. 输入 zellij 或 zellij 自动启动。


## 4 其它终端工具

- [yazi](https://yazi-rs.github.io/): 终端文件管理器，超快的目录浏览与预览（图片/视频/文本），支持多窗格、书签、批量操作、插件与主题。典型用法：在任意目录运行 `yazi`，用方向键导航、Tab 在窗格间切换，按 `:` 进入命令模式执行批量操作。
- [fd](https://github.com/sharkdp/fd): 友好的文件名搜索工具，替代 `find`。默认遵循 `.gitignore`，语法简洁、速度快。示例：`fd src` 查找名称包含 src 的文件/目录；`fd -e rs main` 按扩展名查找。

- [bat](https://github.com/sharkdp/bat): 带语法高亮与行号的 `cat` 增强版，支持 Git 注释与分页器。示例：`bat -n Cargo.toml` 显示行号；`bat -p README.md` 纯净输出适合管道。

- [ripgrep](https://github.com/BurntSushi/ripgrep): 超快的内容搜索工具，替代 `grep`，默认递归并遵循忽略规则。示例：`rg TODO -n` 搜索代码中的 TODO；`rg "fn\s+\w+" -uu` 在所有文件中搜索函数定义（忽略规则禁用）。

- [fzf](https://github.com/junegunn/fzf): 通用模糊查找器，常与 `fd`/`rg` 结合做交互式选择。示例：`fd -t f | fzf` 在文件列表中模糊选择；`history | fzf` 交互式查找历史命令。可与 zsh 绑定快捷键增强补全。

- [glow](https://github.com/charmbracelet/glow): 终端 Markdown 阅读器，支持本地与远程文档的美观渲染。示例：`glow README.md`；`glow` 浏览当前目录所有 Markdown 并用 TUI 选择查看。

