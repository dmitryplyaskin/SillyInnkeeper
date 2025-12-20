# SillyInnkeeper

**SillyInnkeeper** 是一个用于便捷管理 SillyTavern 角色卡片的应用程序。它提供了强大的搜索、筛选和排序工具，可处理数千张卡片，并与 SillyTavern 集成以实现快速启动角色。

> 🌐 **语言**: [English](README.en.md) | [Русский](README.ru.md) | [简体中文](README.ru.md)

> 🔗 **SillyTavern 扩展**: [ST-Extension-SillyInnkeeper](https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper) — 在 SillyTavern 中安装此扩展以与 SillyInnkeeper 集成。

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)[![Branch: zh-CN-translation](D:\SillyInnkeeper\SillyInnkeeper-Chinese-\branch-zh--CN--translation-brightgreen.svg)](https://github.com/你的用户名/原仓库名/tree/zh-CN-translation)

![主界面](../assets/main.webp)

## 关于汉化

- 本汉化不定时更新，有可能落后于原版
- 使用过程中有任何关于汉化的问题请联系我
- 汉化作者 [@刻风雫](https://github.com/544244857)

## 💡 为什么选择 SillyInnkeeper？

如果你拥有大量的角色卡片收藏（数百或数千个文件），你可能遇到过以下问题：

- **卡顿和冻结** — SillyTavern 的内置工具无法处理大量卡片
- **搜索缓慢** — 搜索卡片需要很长时间或根本无法工作
- **筛选不便** — 筛选和排序功能有限
- **导航困难** — 难以在数千个文件中找到合适的卡片
- **元数据缺失** — 不打开文件很难了解卡片的内容

SillyInnkeeper 解决了所有这些问题，为你的卡片收藏提供快速便捷的管理方式。

## ✨ 主要功能

### 卡片库管理

- **自动扫描**：只需指定卡片文件夹 — 应用程序将自动查找并索引所有 PNG 文件
- **自动更新**：当添加新卡片或更改现有卡片时，应用程序将自动更新信息
- **重复管理**：自动检测相同的卡片并便捷管理

### 强大的搜索和筛选

- **按名称搜索**：快速按角色名称搜索卡片
- **按创建者筛选**：查找特定作者的所有卡片
- **按标签筛选**：选择多个标签进行精确搜索
- **按日期筛选**：查找在特定时期创建的卡片
- **按内容筛选**：查找包含特定字段的卡片（例如，仅包含系统提示词或备用问候语的卡片）
- **按大小筛选**：按提示词 token 数量搜索
- **灵活排序**：按创建日期或名称排序

### 便捷的卡片查看

- **信息集中显示**：无需打开文件即可查看所有卡片数据
- **标签页组织**：信息按类别划分以便查看：
  - 主要信息（名称、描述、性格、场景、首条消息）
  - 备用问候语
  - 系统提示词
  - 原始 JSON（供高级用户使用）
- **图片查看**：缩放卡片图片，可选模糊（审查）
- **元数据**：查看 ID、规范版本、创建日期和其他有用信息

### SillyTavern 集成

- **一键启动**："使用"按钮可立即将卡片导入 SillyTavern
- **自动导入**：SillyTavern 扩展自动接收来自 SillyInnkeeper 的卡片
- **卡片导出**：下载带有正确元数据的 PNG 文件，以便在其他应用程序中使用

### 用户体验

- **快速性能**：应用程序经过优化，可处理数千张卡片而不会卡顿
- **自动缩略图**：所有卡片都以缩略图显示，便于快速浏览
- **主题**：浅色、深色和自动主题（跟随系统设置）
- **多语言**：支持俄语、英语和简体中文

### 格式支持

- 支持 Character Card V1、V2 和 V3 — 可使用任何格式的卡片

## 💻 系统要求

- **Node.js**：18.x 或更高版本（推荐 20.x 或 24.x）
- **Yarn**：4.12.0 版本（或 npm 9.x+）
- **操作系统**：Windows 10/11、Linux、macOS
- **内存**：最低 2 GB（大型收藏推荐 4 GB+）
- **可用磁盘空间**：安装至少需要 500 MB + 数据库和缓存所需空间

## 📦 安装

### 前置要求

确保已安装：

- [Node.js](https://nodejs.org/)（18.x 或更高版本）
- [Yarn](https://yarnpkg.com/)（4.12.0 版本）或 npm

### 方法 1：自动安装（Windows）

1. 克隆仓库：

```bash
git clone https://github.com/dmitryplyaskin/SillyInnkeeper.git
cd SillyInnkeeper
```

2. 运行安装脚本：

```bash
start.bat
```

脚本将自动安装所有依赖项、构建项目并启动服务器。浏览器将自动打开。

### 方法 2：手动安装

1. 克隆仓库：

```bash
git clone https://github.com/dmitryplyaskin/SillyInnkeeper.git
cd SillyInnkeeper
```

2. 安装服务器依赖：

```bash
cd server
yarn install
# 或
npm install
```

3. 安装客户端依赖：

```bash
cd ../client
yarn install
# 或
npm install
```

4. 构建项目：

构建客户端：

```bash
cd client
yarn build
# 或
npm run build
```

构建服务器：

```bash
cd server
yarn build
# 或
npm run build
```

5. 启动服务器：

```bash
cd server
yarn start
# 或
npm start
```

6. 打开浏览器并访问：

```
http://127.0.0.1:48912
```

## 🚀 快速开始

### 首次启动

1. **启动应用程序**（参见[安装](#-安装)部分）

2. **配置卡片文件夹路径**：

   - 打开设置（顶部面板中的"设置"按钮）
   - 指定存储 PNG 卡片文件的文件夹路径
   - 保存设置

3. **等待扫描完成**：

   - 首次启动时，应用程序将自动开始扫描指定的文件夹
   - 扫描进度会在界面中显示
   - 完成后，所有卡片都可供搜索和查看

4. **开始使用**：
   - 使用搜索和筛选器查找所需的卡片
   - 点击卡片查看详细信息
   - 使用"使用"按钮在 SillyTavern 中启动卡片（如果已配置集成）

### 设置 SillyTavern 集成

1. 在 SillyTavern 中安装 [ST-Extension-SillyInnkeeper](https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper) 扩展

2. 在扩展设置中，指定 SillyInnkeeper 的 URL：

   ```
   http://127.0.0.1:48912
   ```

3. 启用"自动连接"以实现自动连接

4. 现在你可以使用 SillyInnkeeper 中的"使用"按钮自动将卡片导入 SillyTavern

## 📖 使用说明

### 主界面

应用程序的主屏幕包括：

- **顶部面板**：标题、主题切换器、视图设置、设置和筛选器按钮
- **卡片网格**：所有卡片及其缩略图的列表
- **筛选器侧边栏**：通过"筛选器"按钮打开

### 搜索和筛选

1. **打开筛选器面板**（顶部面板中的"筛选器"按钮）

2. **使用可用的筛选器**：

   - **按名称搜索**：输入角色名称
   - **创建者**：选择一个或多个创建者
   - **规范版本**：按 Character Card 版本筛选（V1/V2/V3）
   - **标签**：选择标签进行筛选
   - **创建日期**：指定日期范围
   - **Token 数**：最小和最大 token 数量
   - **备用问候语**：存在性和最小数量
   - **字段存在性**：选择应存在/不存在的字段

3. **选择排序**：按创建日期或名称排序

4. **应用筛选器**：结果将自动更新

5. **重置筛选器**：使用"重置"按钮清除所有筛选器

### 查看卡片

1. **点击网格中的卡片**打开详细信息

2. **浏览信息**：

   - **"主要"标签页**：角色的主要信息
   - **"备用问候语"标签页**：所有备用问候语
   - **"系统"标签页**：系统提示词和历史后指令
   - **"原始"标签页**：完整的卡片 JSON，可供编辑

3. **使用操作**：
   - **使用**：在 SillyTavern 中启动卡片
   - **下载**：下载卡片的 PNG 文件
   - **重命名**：更改主文件的名称
   - **删除**：删除卡片或重复项

### 库管理

- **自动更新**：当卡片文件夹中的文件发生更改时，应用程序将自动更新索引
- **手动扫描**：可以通过设置启动重新扫描
- **重复管理**：在卡片详细视图中，可以选择主文件或删除重复项

## 🔗 SillyTavern 集成

SillyInnkeeper 通过 [ST-Extension-SillyInnkeeper](https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper) 扩展与 SillyTavern 集成。

### 扩展安装

1. 打开 SillyTavern
2. 前往 **Extensions → Extension Installer**
3. 粘贴仓库 URL：
   ```
   https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper
   ```
4. 点击"Install"

### 扩展配置

1. 在 SillyTavern 中打开 **Extensions → SillyInnkeeper**
2. 指定 **SillyInnkeeper URL**：`http://127.0.0.1:48912`（或你的端口）
3. 启用 **Auto-connect**（推荐）
4. 可选：启用 **Report import result back to SillyInnkeeper**
5. 可选：启用 **Open imported character** 以自动打开导入的角色

### 使用

1. 在 SillyInnkeeper 中打开卡片
2. 在详细视图中点击 **"使用"** 按钮
3. 卡片将自动导入到 SillyTavern
4. 如果启用了"Open imported character"选项，角色将自动打开

## 🗺 未来计划

### 计划功能

1. **完整的 SillyTavern 集成和扫描**

   - 从 SillyTavern 文件夹扫描卡片
   - 管理和编辑卡片、聊天记录、知识库等
   - SillyInnkeeper 和 SillyTavern 之间的双向同步

2. **知识库支持**

   - 查看和管理卡片中的知识库
   - 编辑知识库
   - 导出/导入知识库

3. **多目录支持**

   - 支持多个卡片库
   - 在库之间切换
   - 跨所有库的统一搜索
   - 通过 UI 管理库

4. **自动下载和自动导入**

   - 监控下载文件夹
   - 自动扫描新文件
   - 自动导入到 SillyTavern（可选）
   - 配置自动卡片组织规则

## 📄 许可证

本项目采用 [AGPL-3.0](https://opensource.org/licenses/AGPL-3.0) 许可证。

## 👤 作者

**Dmitry Plyaskin**

- GitHub: [@dmitryplyaskin](https://github.com/dmitryplyaskin)
- 项目: [SillyInnkeeper](https://github.com/dmitryplyaskin/SillyInnkeeper)
- SillyTavern 扩展: [ST-Extension-SillyInnkeeper](https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper)

---

**注意**：SillyInnkeeper 是一个独立项目，并非 SillyTavern 的官方项目。它是一个社区工具，旨在改善角色卡片的使用体验。
