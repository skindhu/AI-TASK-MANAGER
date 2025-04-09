---
description: Guidelines for implementing CLI commands using Commander.js
globs: scripts/modules/commands.js
alwaysApply: false
---

# Command-Line Interface Implementation Guidelines

## Command Structure Standards

- **Basic Command Template**:
  ```javascript
  // ✅ DO: Follow this structure for all commands
  programInstance
    .command('command-name')
    .description('Clear, concise description of what the command does')
    .option('-s, --short-option <value>', 'Option description', 'default value')
    .option('--long-option <value>', 'Option description')
    .action(async (options) => {
      // Command implementation
    });
  ```

- **Command Handler Organization**:
  - ✅ DO: Keep action handlers concise and focused
  - ✅ DO: Extract core functionality to appropriate modules
  - ✅ DO: Include validation for required parameters
  - ❌ DON'T: Implement business logic in command handlers

## Option Naming Conventions

- **Command Names**:
  - ✅ DO: Use kebab-case for command names (`analyze-complexity`)
  - ❌ DON'T: Use camelCase for command names (`analyzeComplexity`)
  - ✅ DO: Use descriptive, action-oriented names

- **Option Names**:
  - ✅ DO: Use kebab-case for long-form option names (`--output-format`)
  - ✅ DO: Provide single-letter shortcuts when appropriate (`-f, --file`)
  - ✅ DO: Use consistent option names across similar commands
  - ❌ DON'T: Use different names for the same concept (`--file` in one command, `--path` in another)

  ```javascript
  // ✅ DO: Use consistent option naming
  .option('-f, --file <path>', 'Path to the tasks file', 'tasks/tasks.json')
  .option('-o, --output <dir>', 'Output directory', 'tasks')
  
  // ❌ DON'T: Use inconsistent naming
  .option('-f, --file <path>', 'Path to the tasks file')
  .option('-p, --path <dir>', 'Output directory') // Should be --output
  ```

  > **Note**: Although options are defined with kebab-case (`--num-tasks`), Commander.js stores them internally as camelCase properties. Access them in code as `options.numTasks`, not `options['num-tasks']`.

## Input Validation

- **Required Parameters**:
  - ✅ DO: Check that required parameters are provided
  - ✅ DO: Provide clear error messages when parameters are missing
  - ✅ DO: Use early returns with process.exit(1) for validation failures

  ```javascript
  // ✅ DO: Validate required parameters early
  if (!prompt) {
    console.error(chalk.red('Error: --prompt parameter is required. Please provide a task description.'));
    process.exit(1);
  }
  ```

- **Parameter Type Conversion**:
  - ✅ DO: Convert string inputs to appropriate types (numbers, booleans)
  - ✅ DO: Handle conversion errors gracefully

  ```javascript
  // ✅ DO: Parse numeric parameters properly
  const fromId = parseInt(options.from, 10);
  if (isNaN(fromId)) {
    console.error(chalk.red('Error: --from must be a valid number'));
    process.exit(1);
  }
  ```

## User Feedback

- **Operation Status**:
  - ✅ DO: Provide clear feedback about the operation being performed
  - ✅ DO: Display success or error messages after completion
  - ✅ DO: Use colored output to distinguish between different message types

  ```javascript
  // ✅ DO: Show operation status
  console.log(chalk.blue(`Parsing PRD file: ${file}`));
  console.log(chalk.blue(`Generating ${numTasks} tasks...`));
  
  try {
    await parsePRD(file, outputPath, numTasks);
    console.log(chalk.green('Successfully generated tasks from PRD'));
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
  ```

## Command Registration

- **Command Grouping**:
  - ✅ DO: Group related commands together in the code
  - ✅ DO: Add related commands in a logical order
  - ✅ DO: Use comments to delineate command groups

- **Command Export**:
  - ✅ DO: Export the registerCommands function
  - ✅ DO: Keep the CLI setup code clean and maintainable

  ```javascript
  // ✅ DO: Follow this export pattern
  export {
    registerCommands,
    setupCLI,
    runCLI
  };
  ```

## Error Handling

- **Exception Management**:
  - ✅ DO: Wrap async operations in try/catch blocks
  - ✅ DO: Display user-friendly error messages
  - ✅ DO: Include detailed error information in debug mode

  ```javascript
  // ✅ DO: Handle errors properly
  try {
    // Command implementation
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    
    if (CONFIG.debug) {
      console.error(error);
    }
    
    process.exit(1);
  }
  ```

## Integration with Other Modules

- **Import Organization**:
  - ✅ DO: Group imports by module/functionality
  - ✅ DO: Import only what's needed, not entire modules
  - ❌ DON'T: Create circular dependencies

  ```javascript
  // ✅ DO: Organize imports by module
  import { program } from 'commander';
  import path from 'path';
  import chalk from 'chalk';
  
  import { CONFIG, log, readJSON } from './utils.js';
  import { displayBanner, displayHelp } from './ui.js';
  import { parsePRD, listTasks } from './task-manager.js';
  import { addDependency } from './dependency-manager.js';
  ```

## Subtask Management Commands

- **Add Subtask Command Structure**:
  ```javascript
  // ✅ DO: Follow this structure for adding subtasks
  programInstance
    .command('add-subtask')
    .description('Add a new subtask to a parent task or convert an existing task to a subtask')
    .option('-f, --file <path>', 'Path to the tasks file', 'tasks/tasks.json')
    .option('-p, --parent <id>', 'ID of the parent task (required)')
    .option('-e, --existing <id>', 'ID of an existing task to convert to a subtask')
    .option('-t, --title <title>', 'Title for the new subtask (when not converting)')
    .option('-d, --description <description>', 'Description for the new subtask (when not converting)')
    .option('--details <details>', 'Implementation details for the new subtask (when not converting)')
    .option('--dependencies <ids>', 'Comma-separated list of subtask IDs this subtask depends on')
    .option('--status <status>', 'Initial status for the subtask', 'pending')
    .action(async (options) => {
      // Validate required parameters
      if (!options.parent) {
        console.error(chalk.red('Error: --parent parameter is required'));
        process.exit(1);
      }
      
      // Validate that either existing task ID or title is provided
      if (!options.existing && !options.title) {
        console.error(chalk.red('Error: Either --existing or --title must be provided'));
        process.exit(1);
      }
      
      try {
        // Implementation
      } catch (error) {
        // Error handling
      }
    });
  ```

- **Remove Subtask Command Structure**:
  ```javascript
  // ✅ DO: Follow this structure for removing subtasks
  programInstance
    .command('remove-subtask')
    .description('Remove a subtask from its parent task, optionally converting it to a standalone task')
    .option('-f, --file <path>', 'Path to the tasks file', 'tasks/tasks.json')
    .option('-i, --id <id>', 'ID of the subtask to remove in format "parentId.subtaskId" (required)')
    .option('-c, --convert', 'Convert the subtask to a standalone task')
    .action(async (options) => {
      // Validate required parameters
      if (!options.id) {
        console.error(chalk.red('Error: --id parameter is required'));
        process.exit(1);
      }
      
      // Validate subtask ID format
      if (!options.id.includes('.')) {
        console.error(chalk.red('Error: Subtask ID must be in format "parentId.subtaskId"'));
        process.exit(1);
      }
      
      try {
        // Implementation
      } catch (error) {
        // Error handling
      }
    });
  ```

Refer to [`commands.js`](mdc:scripts/modules/commands.js) for implementation examples and [`new_features.mdc`](mdc:.cursor/rules/new_features.mdc) for integration guidelines. 