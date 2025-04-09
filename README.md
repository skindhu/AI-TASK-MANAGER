# AI Task Master

### by [@eyaltoledano](https://x.com/eyaltoledano), enhanced by [skindhu]

一个用于AI驱动开发的通用任务管理系统，使用Google Gemini模型，专为与Cursor AI无缝协作而设计。

## 项目背景

Task Master 是对原始 [claude-task-manager](https://github.com/eyaltoledano/claude-task-master) 项目的增强和改进版本。分析了原始项目的设计理念和能力后，发现其具有以下不足：

1. **模型限制**：项目使用的Claude模型API费用高昂（输入$3/百万token，输出$15/百万token），且Claude风控极其严格，API在国内容易被封禁。
2. **知识融合不足**：任务拆分完全依赖PRD文档，缺乏对业务知识的深入理解。
3. **语言单一**：输出仅限英文，需要二次翻译才能便于中文用户理解。
4. **操作繁琐**：任务管理主要依赖CLI命令，缺乏直观的可视化呈现。
5. **拆分不灵活**：任务和子任务拆分必须指定固定数量，不够智能和灵活。

基于以上问题，我们对系统进行了全方位的改进：

1. **模型升级**：将所有Claude调用替换为Gemini 2.5 Pro，不仅免费且更稳定。
2. **知识库集成**：支持在拆分任务时传递业务知识库路径，让AI参考业务背景进行更准确的任务拆解。
3. **中英双语支持**：通过USE_CHINESE环境变量，支持同时生成英文指令和中文描述，既保证指令执行质量，又提升阅读体验。
4. **可视化管理**：新增web服务器功能，提供直观的中文界面管理任务，同时支持一键复制英文指令。
5. **智能拆分**：优化任务拆分逻辑，可以根据任务复杂度自动决定适合的拆解粒度。

这些改进使Task Master成为一个更强大、更友好的AI任务管理工具，特别适合中文开发者使用。
## 系统截图

![Task Master Web UI](assets/manager.png)

*Task Master Web界面展示了任务列表和详细信息，支持中英双语显示和状态管理*



## 核心优势

- **免费稳定的AI模型**: 使用Gemini 2.5 Pro，无需支付高昂的API费用
- **业务知识融合**: 任务拆分时可引入业务知识背景，提高任务理解质量
- **中英双语支持**: 同时生成英文指令和中文描述，兼顾使用体验和执行质量
- **可视化界面**: 提供Web界面进行任务管理，摆脱繁琐的命令行操作
- **灵活任务拆分**: 智能决定最适合的任务拆解粒度

## 系统要求

- Node.js 14.0.0 或更高版本
- Google API key (用于Gemini API访问)
- Anthropic API key (可选，用于传统Claude API支持)
- OpenAI SDK (可选，用于Perplexity API集成)

## 配置

通过项目根目录下的`.env`文件中的环境变量进行配置：

### 必需配置

- `GOOGLE_API_KEY`: 用于Gemini访问的Google API密钥(主要要求)

### 可选配置

- `ANTHROPIC_API_KEY`: 用于Claude的Anthropic API密钥(可选，用于传统支持)
- `MODEL`: 指定要使用的模型 (默认: "gemini-2.5-pro")
- `MAX_TOKENS`: 模型响应的最大令牌数 (默认: 8192)
- `TEMPERATURE`: 模型响应的温度 (默认: 0.7)
- `GEMINI_BASE_URL`: Google Gemini的自定义API端点 (可选)
- `PERPLEXITY_API_KEY`: 用于研究支持的子任务生成的Perplexity API密钥
- `PERPLEXITY_MODEL`: 指定要使用的Perplexity模型 (默认: "sonar-pro")
- `DEBUG`: 启用调试日志 (默认: false)
- `LOG_LEVEL`: 日志级别 - debug, info, warn, error (默认: info)
- `DEFAULT_SUBTASKS`: 展开时的默认子任务数量 (默认: 3)
- `DEFAULT_PRIORITY`: 生成任务的默认优先级 (默认: medium)
- `PROJECT_NAME`: 覆盖tasks.json中的默认项目名称
- `PROJECT_VERSION`: 覆盖tasks.json中的默认版本
- `USE_CHINESE`: 设置后将生成任务的中文翻译字段 (如titleTrans, descriptionTrans等)
- `GEMINI_BASE_URL`: 支持配置GEMINI访问代理

## 安装

```bash
# 全局安装
npm install -g task-master-ai

# 或在项目中本地安装
npm install task-master-ai
```

### 初始化新项目

```bash
# 如果全局安装
task-master init

# 如果本地安装
npx task-master-init
```

这将提示您输入项目详细信息，并设置一个具有必要文件和结构的新项目。

### 重要说明

1. 本包使用ES模块。您的package.json应包含`"type": "module"`。
2. 您需要一个具有适当权限的有效Google API密钥才能使用Gemini Pro 2.5。

## 全局命令快速入门

全局安装软件包后，您可以从任何目录使用这些CLI命令：

```bash
# 初始化新项目
task-master init

# 从PRD解析并生成任务
task-master parse-prd your-prd.txt

# 从PRD解析并生成任务，同时参考业务知识库
task-master parse-prd your-prd.txt -k docs/

# 列出所有任务
task-master list

# 显示下一个要处理的任务
task-master next

# 生成任务文件
task-master generate

# 启动Web界面进行任务管理
task-master server
```

## 任务结构

tasks.json中的任务具有以下结构：

- `id`: 任务的唯一标识符 (例如: `1`)
- `title`: 任务的简短描述性标题 (例如: `"Initialize Repo"`)
- `titleTrans`: 任务标题的中文翻译 (例如: `"初始化仓库"`) (当设置USE_CHINESE时生成)
- `description`: 任务内容的简明描述 (例如: `"Create a new repository, set up initial structure."`)
- `descriptionTrans`: 任务描述的中文翻译 (例如: `"创建新仓库，设置初始结构。"`) (当设置USE_CHINESE时生成)
- `status`: 任务的当前状态 (例如: `"pending"`, `"done"`, `"deferred"`)
- `dependencies`: 必须在此任务之前完成的任务的ID (例如: `[1, 2]`)
  - 依赖项显示带有状态指示器 (✅ 表示已完成, ⏱️ 表示待处理)
  - 这有助于快速识别哪些先决任务正在阻止工作
- `priority`: 任务的重要性级别 (例如: `"high"`, `"medium"`, `"low"`)
- `details`: 深入的实现说明 (例如: `"Use GitHub client ID/secret, handle callback, set session token."`)
- `detailsTrans`: 实现细节的中文翻译 (当设置USE_CHINESE时生成)
- `testStrategy`: 验证方法 (例如: `"Deploy and call endpoint to confirm 'Hello World' response."`)
- `testStrategyTrans`: 测试策略的中文翻译 (当设置USE_CHINESE时生成)
- `subtasks`: 构成主任务的更小、更具体的任务列表 (例如: `[{"id": 1, "title": "Configure OAuth", ...}]`)

## 业务知识集成

Task Master现在支持在任务生成过程中引入业务知识库：

```bash
# 使用知识库目录解析PRD
task-master parse-prd your-prd.txt -k docs/

# 使用特定知识文件解析PRD
task-master parse-prd your-prd.txt -k docs/domain_knowledge.md

# 生成子任务时使用知识库(如果parse-prd时已使用知识库，则无需再次指定)
task-master expand --id=3 -k docs/
```

业务知识集成的优势：
- 任务拆分更贴合业务实际需求
- 提高任务描述的准确性和相关性
- 减少AI对业务理解不足导致的错误
- 知识库一旦在PRD解析时引入，会自动用于后续的子任务拆分

## 中英双语支持

设置`USE_CHINESE=true`环境变量后，系统会同时生成英文指令和中文描述：

- 英文字段用于AI执行，确保指令执行质量
- 中文字段用于人工查看，提高理解效率
- Web界面默认显示中文字段（如果存在）

中文字段包括：
- `titleTrans`: 任务标题的中文翻译
- `descriptionTrans`: 任务描述的中文翻译
- `detailsTrans`: 实现细节的中文翻译
- `testStrategyTrans`: 测试策略的中文翻译

## Web界面

Task Master包含内置的Web界面，用于任务可视化和管理。

### 启动Web服务器

```bash
# 在默认端口(3002)上启动Web服务器
task-master server

# 使用自定义端口
task-master server --port=4000

# 指定替代tasks.json文件
task-master server --file=custom-tasks.json

# 启动并显示调试路径信息
task-master server --debug-paths
```

### Web界面功能

- **任务列表视图**: 浏览所有任务，可按状态筛选
- **任务详情视图**: 查看每个任务的综合信息
- **子任务管理**: 查看和交互子任务
- **状态更新**: 直接从Web界面更改任务状态
- **本地化支持**: 通过locale参数在英文和中文内容之间切换
- **API访问**: 通过RESTful端点以编程方式访问任务数据

### API端点

Web服务器提供以下RESTful API端点：

- **GET /api/tasks**: 获取所有任务及其子任务
  ```bash
  # 使用默认语言(中文)获取任务
  curl http://localhost:3002/api/tasks

  # 以英文获取任务
  curl http://localhost:3002/api/tasks?locale=en
  ```

- **GET /api/tasks/:taskId**: 通过ID获取特定任务
  ```bash
  # 以英文获取ID为1的任务
  curl http://localhost:3002/api/tasks/1?locale=en
  ```

- **PUT /api/tasks/:taskId**: 更新任务属性
  ```bash
  # 更新任务状态
  curl -X PUT http://localhost:3002/api/tasks/1 -H "Content-Type: application/json" -d '{"status":"done"}'
  ```

- **PUT /api/tasks/:taskId/subtasks/:subtaskId**: 更新子任务属性
  ```bash
  # 更新子任务状态
  curl -X PUT http://localhost:3002/api/tasks/1/subtasks/2 -H "Content-Type: application/json" -d '{"status":"done"}'
  ```

## 与Cursor AI集成

Task Master专为与[Cursor AI](https://www.cursor.so/)无缝协作而设计，为AI驱动的开发提供结构化工作流。

### 使用Cursor设置

1. 初始化项目后，在Cursor中打开它
2. `.cursor/rules/dev_workflow.mdc`文件被Cursor自动加载，向AI提供有关任务管理系统的知识
3. 将PRD文档放在`scripts/`目录中(例如，`scripts/prd.txt`)
4. 打开Cursor的AI聊天并切换到Agent模式

### 在Cursor中设置MCP

要使用模型控制协议(MCP)直接在Cursor中启用增强的任务管理功能：

1. 转到Cursor设置
2. 导航到MCP部分
3. 点击"添加新MCP服务器"
4. 使用以下详细信息进行配置：
   - 名称："Task Master"
   - 类型："Command"
   - 命令："npx -y --package task-master-ai task-master-mcp"
5. 保存设置

配置完成后，您可以直接通过Cursor的界面与Task Master的任务管理命令交互，提供更集成的体验。

### 初始任务生成

在Cursor的AI聊天中，指示代理从您的PRD生成任务：

```
请使用task-master parse-prd命令从我的PRD生成任务。PRD位于scripts/prd.txt。
```

代理将执行：

```bash
task-master parse-prd scripts/prd.txt
```

或者，如果您想要利用业务知识库：

```bash
task-master parse-prd scripts/prd.txt -k docs/
```

这将：

- 解析您的PRD文档
- 生成具有任务、依赖项、优先级和测试策略的结构化`tasks.json`文件
- 由于Cursor规则，代理将理解此过程

## AI驱动的开发工作流

通过Cursor代理预配置（通过规则文件），可以遵循以下工作流程：

### 1. 任务发现和选择

询问代理可用的任务：

```
有哪些任务可以进行处理？
```

代理将：

- 运行`task-master list`查看所有任务
- 运行`task-master next`确定下一个要处理的任务
- 分析依赖关系，确定哪些任务已准备好进行处理
- 基于优先级和ID顺序对任务进行优先排序
- 建议下一个要实现的任务

### 2. 任务实现

在实现任务时，代理将：

- 参考任务的详细信息部分了解实现细节
- 考虑对先前任务的依赖关系
- 遵循项目的编码标准
- 基于任务的testStrategy创建适当的测试

您可以询问：

```
让我们实现任务3。它涉及什么？
```

### 3. 任务验证

在将任务标记为完成之前，根据以下内容进行验证：

- 任务指定的testStrategy
- 代码库中的任何自动测试
- 必要时进行手动验证

### 4. 任务完成

当任务完成时，告诉代理：

```
任务3现在已完成。请更新其状态。
```

代理将执行：

```bash
task-master set-status --id=3 --status=done
```

### 5. 处理实现偏差

如果在实现过程中，您发现：

- 当前方法与计划的有显著不同
- 由于当前实现选择，未来任务需要修改
- 出现了新的依赖项或需求

告诉代理：

```
我们改变了方法。我们现在使用Express而不是Fastify。请更新所有未来任务以反映这一变化。
```

代理将执行：

```bash
task-master update --from=4 --prompt="现在我们使用Express而不是Fastify。"
```

这将重写或重新调整tasks.json中的后续任务，同时保留已完成的工作。

### 6. 分解复杂任务

对于需要更细粒度的复杂任务：

```
任务5看起来很复杂。能将它分解为子任务吗？
```

代理将执行：

```bash
task-master expand --id=5 --num=3
```

您可以提供额外的上下文：

```
请分解任务5，重点关注安全考虑因素。
```

代理将执行：

```bash
task-master expand --id=5 --prompt="重点关注安全方面"
```

您还可以展开所有待处理的任务：

```
请将所有待处理的任务分解为子任务。
```

代理将执行：

```bash
task-master expand --all
```

对于使用Perplexity AI的研究支持的子任务生成：

```
请使用研究支持的生成方式分解任务5。
```

代理将执行：

```bash
task-master expand --id=5 --research
```

## 命令参考

以下是所有可用命令的综合参考：

### 解析PRD

```bash
# 解析PRD文件并生成任务
task-master parse-prd <prd-file.txt>

# 限制生成的任务数量
task-master parse-prd <prd-file.txt> --num-tasks=10

# 使用业务知识库解析PRD
task-master parse-prd <prd-file.txt> -k docs/

# 使用特定知识文件解析PRD
task-master parse-prd <prd-file.txt> -k docs/domain_knowledge.md
```

### 列出任务

```bash
# 列出所有任务
task-master list

# 列出具有特定状态的任务
task-master list --status=<status>

# 列出带有子任务的任务
task-master list --with-subtasks

# 列出具有特定状态并包含子任务的任务
task-master list --status=<status> --with-subtasks
```

### 显示下一个任务

```bash
# 根据依赖关系和状态显示下一个要处理的任务
task-master next
```

### 显示特定任务

```bash
# 显示特定任务的详细信息
task-master show <id>
# 或
task-master show --id=<id>

# 查看特定子任务（例如，任务1的子任务2）
task-master show 1.2
```

### 更新任务

```bash
# 从特定ID更新任务并提供上下文
task-master update --from=<id> --prompt="<prompt>"
```

### 生成任务文件

```bash
# 从tasks.json生成单独的任务文件
task-master generate
```

### 设置任务状态

```bash
# 设置单个任务的状态
task-master set-status --id=<id> --status=<status>

# 设置多个任务的状态
task-master set-status --id=1,2,3 --status=<status>

# 设置子任务的状态
task-master set-status --id=1.1,1.2 --status=<status>
```

当将任务标记为"done"时，其所有子任务也将自动标记为"done"。

### 展开任务

```bash
# 使用子任务展开特定任务
task-master expand --id=<id> --num=<number>

# 使用额外上下文展开
task-master expand --id=<id> --prompt="<context>"

# 展开所有待处理的任务
task-master expand --all

# 强制为已有子任务的任务重新生成子任务
task-master expand --all --force

# 为特定任务进行研究支持的子任务生成
task-master expand --id=<id> --research

# 为所有任务进行研究支持的生成
task-master expand --all --research
```

### 清除子任务

```bash
# 清除特定任务的子任务
task-master clear-subtasks --id=<id>

# 清除多个任务的子任务
task-master clear-subtasks --id=1,2,3

# 清除所有任务的子任务
task-master clear-subtasks --all
```

### 分析任务复杂度

```bash
# 分析所有任务的复杂度
task-master analyze-complexity

# 将报告保存到自定义位置
task-master analyze-complexity --output=my-report.json

# 使用特定的LLM模型
task-master analyze-complexity --model=claude-3-opus-20240229

# 设置自定义复杂度阈值（1-10）
task-master analyze-complexity --threshold=6

# 使用替代的任务文件
task-master analyze-complexity --file=custom-tasks.json

# 使用Perplexity AI进行研究支持的复杂度分析
task-master analyze-complexity --research
```

### 查看复杂度报告

```bash
# 显示任务复杂度分析报告
task-master complexity-report

# 查看自定义位置的报告
task-master complexity-report --file=my-report.json
```

### 管理任务依赖

```bash
# 向任务添加依赖
task-master add-dependency --id=<id> --depends-on=<id>

# 从任务中移除依赖
task-master remove-dependency --id=<id> --depends-on=<id>

# 验证依赖而不修复它们
task-master validate-dependencies

# 自动查找并修复无效的依赖
task-master fix-dependencies
```

### 添加新任务

```bash
# 使用AI辅助添加新任务
task-master add-task --prompt="<task description>"

# 添加带有依赖和优先级的任务
task-master add-task --prompt="<task description>" --dependencies=1,2 --priority=high
```

### 服务器命令

```bash
# 启动任务可视化和管理的Web服务器
task-master server

# 使用自定义端口（默认为3002）
task-master server --port=4000

# 指定替代的tasks.json文件
task-master server --file=custom-tasks.json

# 调试服务器路径解析问题
task-master server --debug-paths
```

## 变更日志

### 最新增强功能

- **模型升级**: 从Claude切换到Gemini 2.5 Pro，提供免费稳定的API访问
- **知识库集成**: 在任务拆分时融入业务知识背景
- **中英双语支持**: 同时生成任务的英文指令和中文描述
- **Web管理界面**: 增加task-master server命令启动可视化任务管理系统
- **路由优化**: 修复路由优先级以确保正确处理API端点
- **API错误处理**: 为API端点添加专用404响应
- **静态文件解析**: 增强路径检测以可靠地提供静态资产
- **执行权限处理**: CLI运行器自动设置适当的执行权限
- **路径调试**: 调试模式帮助排查部署问题