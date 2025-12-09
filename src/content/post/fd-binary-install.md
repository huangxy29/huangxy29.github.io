---
title: "手动安装fd"
description: "使用二进制文件手动安装fd命令"
publishDate: "09 December 2025"
tags: ["cli", "linux", "tool", "install"]
---

## 1 安装过程简介

安装主要包含三个部分：
1. 可执行文件：fd 命令本身。
2. Man-page：man fd 命令的帮助文档。
3. 自动补全脚本：让您在使用 fd 时可以通过按 Tab 键自动补全命令和参数。

---

## 2 安装详细步骤

### 2.1 下载并解压[release文件](https://github.com/sharkdp/fd/releases)

### 2.2 安装可执行文件

为了让系统能在任何路径下找到 fd 命令，我们需要把它复制到一个位于您系统 $PATH 环境变量中的目录。一个标准的存放位置是 /usr/local/bin。

运行以下命令来复制文件。这需要管理员权限，所以会使用 sudo。
```bash
sudo cp fd /usr/local/bin/
```

### 2.3 安装 man page 帮助文档

接下来，将安装 man 帮助文档，这样就可以通过运行 man fd 来查看它的详细用法了。

```bash
sudo mkdir -p /usr/local/share/man/man1 && sudo cp fd.1 /usr/local/share/man/man1/
```
帮助文档也已安装完毕。

### 2.4 安装 Shell 自动补全脚本

最后一步是安装 shell 自动补全脚本，这样在终端输入 fd 并按下 Tab 键时，可以自动补全命令的参数和选项。

需要根据自己正在使用的 shell 类型，选择对应的命令来安装。autocomplete 目录下包含了 bash、fish 和 zsh (_fd) 的脚本。

对于 Bash 用户：
将把 fd.bash 脚本复制到系统的自动补全目录中。
```bash
sudo cp autocomplete/fd.bash /etc/bash_completion.d/fd
```
注意：某些系统上的路径可能是 /usr/share/bash-completion/completions/fd
Bash 的自动补全脚本已安装。如果您使用其他 shell，可以参考以下说明。

对于 Fish 用户：
将 fd.fish 复制到 Fish 的 completions 目录：
```bash
sudo cp autocomplete/fd.fish /usr/share/fish/completions/
```

对于 Zsh 用户：
Zsh 的补全脚本是 _fd。您需要将其复制到 Zsh 的一个 fpath 目录中，例如：
```bash
sudo cp autocomplete/_fd /usr/local/share/zsh/site-functions/
```

---


## 3 安装完成

执行以下命令测试使用

```bash
fd --help
fd --version
```

## 4 常用命令示例

- 基本搜索：在当前目录及子目录中查找包含关键词的文件或目录
```bash
fd config
```

- 指定搜索路径：在指定目录中查找
```bash
fd nginx /etc
```

- 按扩展名查找：仅匹配指定扩展名
```bash
fd -e rs main
fd -e md readme
```

- 仅查找文件或目录
```bash
fd -t f config         # 只匹配文件
fd -t d src            # 只匹配目录
```

- 限制搜索深度
```bash
fd -d 2 .              # 深度不超过 2
```

- 包含隐藏文件与忽略规则文件
```bash
fd -H "^\."            # 包含隐藏文件（如 .env）
fd -u target           # 忽略 .gitignore 等忽略规则
```

- 大小写匹配控制
```bash
fd -i Readme           # 强制大小写不敏感
fd -s Makefile         # 强制大小写敏感
```

- 使用正则表达式匹配
```bash
fd "config.*\\.json"
```

- 排除目录或文件
```bash
fd -E node_modules lodash
fd -E "dist|build" index
```

- 输出绝对路径
```bash
fd -a Cargo.toml
```

- 结果只显示路径（适合集成脚本）
```bash
fd -p src              # 仅路径，不带额外颜色/装饰
```

- 对匹配结果执行命令（谨慎使用）
```bash
fd -t f -e log -x rm "{}"          # 删除所有 .log 文件
fd -t d -x sh -c 'echo "{}"; ls "{}"'  # 对每个目录执行命令
```

- 与 xargs 配合（当需要复杂管道时）
```bash
fd -t f -e jpg | xargs -I{} cp "{}" /tmp/images/
```

- 多模式匹配（使用正则 |）
```bash
fd "README|LICENSE"
```

- 仅在 Git 项目跟踪的文件中搜索（遵循忽略规则，默认行为）
```bash
fd src                 # 默认遵循 .gitignore
```

- 在二进制仓库或体积较大目录中快速定位（结合排除）
```bash
fd -E node_modules -E .git -E dist "lock|config"
```

- 查找符号链接或可执行文件
```bash
fd -t l                # 只匹配符号链接
fd -t x                # 只匹配可执行文件
```

- 指定起始路径并按名称精确匹配
```bash
fd -a -g "*/Dockerfile" /
```
