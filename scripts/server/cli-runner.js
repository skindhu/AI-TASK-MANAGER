#!/usr/bin/env node

/**
 * Task Master Web UI Server
 * Standalone entry point for running the task management web UI
 */

import { startWebServer } from './index.js';
import { program } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * 显示路径调试信息
 */
function showPathDebugInfo() {
  console.log(chalk.cyan('=== Path Debug Information ==='));

  // 显示当前工作目录
  console.log(chalk.white('Current working directory:'));
  console.log(chalk.yellow(`  ${process.cwd()}`));

  // 显示脚本目录
  console.log(chalk.white('Script directory:'));
  console.log(chalk.yellow(`  ${__dirname}`));

  // 列出所有可能的静态文件路径
  const possiblePaths = [
    path.resolve(process.cwd(), 'assets/web-ui'),
    path.resolve(__dirname, '../../assets/web-ui'),
    path.resolve(process.cwd(), 'claude-task-master/assets/web-ui'),
    path.resolve('/Users/huli/open_source/claude-task-master/assets/web-ui')
  ];

  console.log(chalk.white('Possible static file paths:'));
  possiblePaths.forEach(p => {
    const exists = fs.existsSync(p);
    console.log(chalk.yellow(`  ${p} ${exists ? chalk.green('(exists)') : chalk.red('(not found)')}`));

    // 如果目录存在，检查index.html
    if (exists) {
      const indexPath = path.join(p, 'index.html');
      const indexExists = fs.existsSync(indexPath);
      console.log(chalk.yellow(`    - index.html ${indexExists ? chalk.green('(exists)') : chalk.red('(not found)')}`));

      // 检查CSS和JS目录
      const cssDir = path.join(p, 'css');
      const cssExists = fs.existsSync(cssDir);
      console.log(chalk.yellow(`    - css/ ${cssExists ? chalk.green('(exists)') : chalk.red('(not found)')}`));

      const jsDir = path.join(p, 'js');
      const jsExists = fs.existsSync(jsDir);
      console.log(chalk.yellow(`    - js/ ${jsExists ? chalk.green('(exists)') : chalk.red('(not found)')}`));
    }
  });

  // 检查任务文件
  console.log(chalk.white('\nTask file information:'));
  const tasksPath = path.resolve(process.cwd(), 'tasks/tasks.json');
  const tasksExists = fs.existsSync(tasksPath);
  console.log(chalk.yellow(`  ${tasksPath} ${tasksExists ? chalk.green('(exists)') : chalk.red('(not found)')}`));

  console.log(chalk.cyan('=============================='));
}

// Set up CLI
program
  .name('task-master-server')
  .description('Task Master Web UI Server')
  .option('-p, --port <port>', 'Port to run the server on', '3002')
  .option('-f, --file <file>', 'Path to the tasks file', 'tasks/tasks.json')
  .option('-d, --debug-paths', 'Show all path information for debugging')
  .parse(process.argv);

const options = program.opts();
const port = parseInt(options.port, 10);
const tasksPath = options.file;
const debugPaths = options.debugPaths || false;

// 如果调试模式打开则输出所有路径信息
if (debugPaths) {
  showPathDebugInfo();
}

// Check if tasks file exists
if (!fs.existsSync(tasksPath)) {
  console.error(chalk.red(`Error: Tasks file not found at ${tasksPath}`));
  console.log(chalk.yellow('Make sure you have initialized the project with tasks.'));
  process.exit(1);
}

console.log(chalk.blue(`Starting Task Management Web UI on port ${port}`));
console.log(chalk.blue(`Using tasks from: ${tasksPath}`));
console.log(chalk.blue('Attempting to locate static UI files...'));

// Start the server
startWebServer({ port, tasksPath })
  .catch(error => {
    console.error(chalk.red(`Failed to start web server: ${error.message}`));
    process.exit(1);
  });

// Handle shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nShutting down web server...'));
  process.exit(0);
});