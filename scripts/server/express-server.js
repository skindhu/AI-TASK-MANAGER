/**
 * web-server.js
 * Express server for task visualization web interface
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { readJSON, log } from '../modules/utils.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 查找静态文件目录
 * @returns {{path: string, exists: boolean}} 找到的路径和是否存在
 */
function findStaticFilesDir() {
  // 尝试多个可能的路径
  const possiblePaths = [
    // 当前工作目录
    path.resolve(process.cwd(), 'assets/web-ui'),
    // 从脚本位置向上查找
    path.resolve(__dirname, '../../assets/web-ui'),
    // 从仓库根目录查找
    path.resolve(process.cwd(), 'claude-task-manager/assets/web-ui'),
    // 绝对路径下查找仓库路径
    path.resolve('/Users/huli/open_source/claude-task-manager/assets/web-ui')
  ];

  log('info', 'Searching for static files directory...');

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      log('info', `Found static files directory at: ${p}`);
      return { path: p, exists: true };
    }
    log('debug', `Directory not found at: ${p}`);
  }

  // 返回第一个路径作为默认创建位置
  log('warn', 'Could not find static files directory in any expected location');
  return { path: possiblePaths[0], exists: false };
}

/**
 * Start the web server
 * @param {Object} options Server configuration options
 * @param {number} options.port Port to run the server on
 * @param {string} options.tasksPath Path to the tasks.json file
 * @returns {Promise<Object>} Server instance
 */
export async function startWebServer(options = {}) {
  const port = options.port || 3002;
  const tasksPath = options.tasksPath || 'tasks/tasks.json';

  const app = express();

  // Enable CORS
  app.use(cors());

  // JSON parsing middleware
  app.use(express.json());

  // 查找静态文件目录
  const { path: staticFilesDir, exists } = findStaticFilesDir();

  // 设置静态文件目录
  if (exists) {
    log('info', `Serving static files from ${staticFilesDir}`);
    app.use(express.static(staticFilesDir));
  } else {
    log('error', `Static files directory not found at ${staticFilesDir}`);
    log('error', 'The server will start but no UI will be available');
    console.log(chalk.red('Error: Static files directory not found'));
    console.log(chalk.yellow('Please ensure the assets/web-ui directory exists with the necessary UI files'));
    console.log(chalk.yellow('You can use the --debug-paths flag to see which paths were checked'));
  }

  // API endpoints
  app.get('/api/tasks', (req, res) => {
    try {
      const data = readJSON(tasksPath);
      if (!data) {
        return res.status(404).json({ error: 'Tasks file not found' });
      }

      // 采用中文优先策略：克隆数据以避免修改原始数据
      const localizedData = JSON.parse(JSON.stringify(data));

      // 处理每个任务，优先使用中文翻译字段（如果存在）
      localizedData.tasks = localizedData.tasks.map(task => {
        // 优先使用中文标题
        if (task.titleTrans) {
          task.title = task.titleTrans;
        }

        // 优先使用中文描述
        if (task.descriptionTrans) {
          task.description = task.descriptionTrans;
        }

        // 优先使用中文详情
        if (task.detailsTrans) {
          task.details = task.detailsTrans;
        }

        // 优先使用中文测试策略
        if (task.testStrategyTrans) {
          task.testStrategy = task.testStrategyTrans;
        }

        // 处理子任务的翻译字段
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks = task.subtasks.map(subtask => {
            // 优先使用中文标题
            if (subtask.titleTrans) {
              subtask.title = subtask.titleTrans;
            }

            // 优先使用中文描述
            if (subtask.descriptionTrans) {
              subtask.description = subtask.descriptionTrans;
            }

            // 优先使用中文详情
            if (subtask.detailsTrans) {
              subtask.details = subtask.detailsTrans;
            }

            // 优先使用中文测试策略
            if (subtask.testStrategyTrans) {
              subtask.testStrategy = subtask.testStrategyTrans;
            }

            return subtask;
          });
        }

        return task;
      });

      res.json(localizedData);
    } catch (error) {
      log('error', `Error reading tasks: ${error.message}`);
      res.status(500).json({ error: 'Failed to read tasks data' });
    }
  });

  // 获取单个任务的API
  app.get('/api/tasks/:taskId', (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const locale = req.query.locale || 'zh'; // 默认使用中文

      const data = readJSON(tasksPath);
      if (!data || !data.tasks) {
        return res.status(404).json({ error: 'Tasks file not found' });
      }

      // 查找任务
      const task = data.tasks.find(t => t.id === taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // 克隆任务以避免修改原始数据
      const taskCopy = JSON.parse(JSON.stringify(task));

      // 如果请求英文内容，则返回原始字段
      if (locale === 'en') {
        return res.json(taskCopy);
      }

      // 如果请求中文内容，则进行本地化处理
      const localizedTask = { ...taskCopy };

      // 优先使用中文标题
      if (localizedTask.titleTrans) {
        localizedTask.title = localizedTask.titleTrans;
      }

      // 优先使用中文描述
      if (localizedTask.descriptionTrans) {
        localizedTask.description = localizedTask.descriptionTrans;
      }

      // 优先使用中文详情
      if (localizedTask.detailsTrans) {
        localizedTask.details = localizedTask.detailsTrans;
      }

      // 优先使用中文测试策略
      if (localizedTask.testStrategyTrans) {
        localizedTask.testStrategy = localizedTask.testStrategyTrans;
      }

      // 处理子任务的翻译字段
      if (localizedTask.subtasks && localizedTask.subtasks.length > 0) {
        localizedTask.subtasks = localizedTask.subtasks.map(subtask => {
          const subtaskCopy = { ...subtask };

          // 优先使用中文标题
          if (subtaskCopy.titleTrans) {
            subtaskCopy.title = subtaskCopy.titleTrans;
          }

          // 优先使用中文描述
          if (subtaskCopy.descriptionTrans) {
            subtaskCopy.description = subtaskCopy.descriptionTrans;
          }

          // 优先使用中文详情
          if (subtaskCopy.detailsTrans) {
            subtaskCopy.details = subtaskCopy.detailsTrans;
          }

          // 优先使用中文测试策略
          if (subtaskCopy.testStrategyTrans) {
            subtaskCopy.testStrategy = subtaskCopy.testStrategyTrans;
          }

          return subtaskCopy;
        });
      }

      res.json(localizedTask);
    } catch (error) {
      log('error', `Error reading task: ${error.message}`);
      res.status(500).json({ error: 'Failed to read task data' });
    }
  });

  // Task update endpoint
  app.put('/api/tasks/:taskId', (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const updates = req.body;

      const data = readJSON(tasksPath);
      if (!data || !data.tasks) {
        return res.status(404).json({ error: 'Tasks file not found' });
      }

      // Find and update the task
      const taskIndex = data.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // 获取原始任务
      const originalTask = data.tasks[taskIndex];

      // 根据翻译字段存在情况，处理更新
      // 注意：如果前端直接修改了title/description等字段，我们需要判断是修改翻译还是原始内容

      // 标题：如果任务有titleTrans字段，则更新titleTrans；否则更新title
      if (updates.title) {
        if (originalTask.titleTrans) {
          // 已有中文翻译，更新中文翻译
          updates.titleTrans = updates.title;
          // 保持原始英文不变
          updates.title = originalTask.title;
        }
        // 无中文翻译时，直接更新英文title
      }

      // 描述：如果任务有descriptionTrans字段，则更新descriptionTrans；否则更新description
      if (updates.description) {
        if (originalTask.descriptionTrans) {
          // 已有中文翻译，更新中文翻译
          updates.descriptionTrans = updates.description;
          // 保持原始英文不变
          updates.description = originalTask.description;
        }
        // 无中文翻译时，直接更新英文description
      }

      // 详情：如果任务有detailsTrans字段，则更新detailsTrans；否则更新details
      if (updates.details) {
        if (originalTask.detailsTrans) {
          // 已有中文翻译，更新中文翻译
          updates.detailsTrans = updates.details;
          // 保持原始英文不变
          updates.details = originalTask.details;
        }
        // 无中文翻译时，直接更新英文details
      }

      // 测试策略：如果任务有testStrategyTrans字段，则更新testStrategyTrans；否则更新testStrategy
      if (updates.testStrategy) {
        if (originalTask.testStrategyTrans) {
          // 已有中文翻译，更新中文翻译
          updates.testStrategyTrans = updates.testStrategy;
          // 保持原始英文不变
          updates.testStrategy = originalTask.testStrategy;
        }
        // 无中文翻译时，直接更新英文testStrategy
      }

      // 更新任务字段
      data.tasks[taskIndex] = { ...originalTask, ...updates };

      // 写入文件
      fs.writeFileSync(tasksPath, JSON.stringify(data, null, 2));

      // 返回更新后的任务，自动处理返回值（优先使用中文翻译）
      const updatedTask = data.tasks[taskIndex];
      const localizedTask = JSON.parse(JSON.stringify(updatedTask));

      // 优先使用中文字段
      if (localizedTask.titleTrans) {
        localizedTask.title = localizedTask.titleTrans;
      }

      if (localizedTask.descriptionTrans) {
        localizedTask.description = localizedTask.descriptionTrans;
      }

      if (localizedTask.detailsTrans) {
        localizedTask.details = localizedTask.detailsTrans;
      }

      if (localizedTask.testStrategyTrans) {
        localizedTask.testStrategy = localizedTask.testStrategyTrans;
      }

      res.json(localizedTask);
    } catch (error) {
      log('error', `Error updating task: ${error.message}`);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Subtask update endpoint
  app.put('/api/tasks/:taskId/subtasks/:subtaskId', (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const subtaskId = parseInt(req.params.subtaskId, 10);
      const updates = req.body;

      const data = readJSON(tasksPath);
      if (!data || !data.tasks) {
        return res.status(404).json({ error: 'Tasks file not found' });
      }

      // 查找父任务
      const taskIndex = data.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Parent task not found' });
      }

      const task = data.tasks[taskIndex];

      // 确保任务有子任务数组
      if (!task.subtasks || !Array.isArray(task.subtasks)) {
        return res.status(404).json({ error: 'Task has no subtasks' });
      }

      // 查找子任务
      const subtaskIndex = task.subtasks.findIndex(st => st.id === subtaskId);
      if (subtaskIndex === -1) {
        return res.status(404).json({ error: 'Subtask not found' });
      }

      // 获取原始子任务
      const originalSubtask = task.subtasks[subtaskIndex];

      // 根据翻译字段存在情况，处理更新

      // 标题：如果子任务有titleTrans字段，则更新titleTrans；否则更新title
      if (updates.title) {
        if (originalSubtask.titleTrans) {
          // 已有中文翻译，更新中文翻译
          updates.titleTrans = updates.title;
          // 保持原始英文不变
          updates.title = originalSubtask.title;
        }
        // 无中文翻译时，直接更新英文title
      }

      // 描述：如果子任务有descriptionTrans字段，则更新descriptionTrans；否则更新description
      if (updates.description) {
        if (originalSubtask.descriptionTrans) {
          // 已有中文翻译，更新中文翻译
          updates.descriptionTrans = updates.description;
          // 保持原始英文不变
          updates.description = originalSubtask.description;
        }
        // 无中文翻译时，直接更新英文description
      }

      // 详情：如果子任务有detailsTrans字段，则更新detailsTrans；否则更新details
      if (updates.details) {
        if (originalSubtask.detailsTrans) {
          // 已有中文翻译，更新中文翻译
          updates.detailsTrans = updates.details;
          // 保持原始英文不变
          updates.details = originalSubtask.details;
        }
        // 无中文翻译时，直接更新英文details
      }

      // 测试策略：如果子任务有testStrategyTrans字段，则更新testStrategyTrans；否则更新testStrategy
      if (updates.testStrategy) {
        if (originalSubtask.testStrategyTrans) {
          // 已有中文翻译，更新中文翻译
          updates.testStrategyTrans = updates.testStrategy;
          // 保持原始英文不变
          updates.testStrategy = originalSubtask.testStrategy;
        }
        // 无中文翻译时，直接更新英文testStrategy
      }

      // 更新子任务
      task.subtasks[subtaskIndex] = { ...originalSubtask, ...updates };

      // 写入文件
      fs.writeFileSync(tasksPath, JSON.stringify(data, null, 2));

      // 返回更新后的子任务，处理返回值（优先使用中文翻译）
      const updatedSubtask = task.subtasks[subtaskIndex];
      const localizedSubtask = JSON.parse(JSON.stringify(updatedSubtask));

      // 优先使用中文字段
      if (localizedSubtask.titleTrans) {
        localizedSubtask.title = localizedSubtask.titleTrans;
      }

      if (localizedSubtask.descriptionTrans) {
        localizedSubtask.description = localizedSubtask.descriptionTrans;
      }

      if (localizedSubtask.detailsTrans) {
        localizedSubtask.details = localizedSubtask.detailsTrans;
      }

      if (localizedSubtask.testStrategyTrans) {
        localizedSubtask.testStrategy = localizedSubtask.testStrategyTrans;
      }

      res.json(localizedSubtask);
    } catch (error) {
      log('error', `Error updating subtask: ${error.message}`);
      res.status(500).json({ error: 'Failed to update subtask' });
    }
  });

  // 修正catch-all路由以使用找到的静态文件目录
  app.get('*', (req, res) => {
    // Skip catch-all for API requests
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }

    if (exists) {
      const indexPath = path.join(staticFilesDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
        return;
      }
    }

    // 显示错误信息和一个基本HTML页面
    const errorHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Master - Error</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
        .error { color: #e74c3c; }
        .info { color: #3498db; }
        pre { background: #f8f8f8; padding: 10px; border-radius: 4px; overflow-x: auto; }
        h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .solutions { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Task Master Web UI Error</h1>

      <div class="error">
        <h2>Error: Web UI files not found</h2>
        <p>The server is running, but the web UI files could not be found.</p>
      </div>

      <div class="info">
        <h3>API Status</h3>
        <p>The API endpoints are still available at:</p>
        <pre>http://localhost:${port}/api/tasks</pre>
      </div>

      <div class="solutions">
        <h3>Possible Solutions:</h3>
        <ol>
          <li>Make sure the assets/web-ui directory exists in your project root</li>
          <li>Check that the directory contains index.html, css/, and js/ files</li>
          <li>Run the server with --debug-paths flag to see which paths were checked</li>
          <li>Make sure you're running the server from the correct directory</li>
        </ol>
      </div>
    </body>
    </html>
    `;

    res.status(404).send(errorHtml);
  });

  // Start the server
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, () => {
        log('success', `Task Management Web UI running at http://localhost:${port}`);
        console.log(`Task Management Web UI running at http://localhost:${port}`);

        if (!exists) {
          console.log(chalk.yellow('Warning: Static files not found. API is available but web UI may not work.'));
          console.log(chalk.yellow('Run with --debug-paths for more information.'));
        }

        resolve(server);
      });
    } catch (error) {
      log('error', `Failed to start web server: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Stop the web server
 * @param {Object} server Server instance to stop
 * @returns {Promise<void>}
 */
export async function stopWebServer(server) {
  return new Promise((resolve, reject) => {
    if (!server) {
      log('warn', 'No server instance to stop');
      return resolve();
    }

    server.close((err) => {
      if (err) {
        log('error', `Error stopping server: ${err.message}`);
        return reject(err);
      }
      log('info', 'Web server stopped');
      resolve();
    });
  });
}