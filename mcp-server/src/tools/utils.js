/**
 * tools/utils.js
 * Utility functions for Task Master CLI integration
 */

import { spawnSync } from "child_process";

/**
 * Execute a Task Master CLI command using child_process
 * @param {string} command - The command to execute
 * @param {Object} log - The logger object from FastMCP
 * @param {Array} args - Arguments for the command
 * @param {string} cwd - Working directory for command execution (defaults to current project root)
 * @returns {Object} - The result of the command execution
 */
export function executeTaskMasterCommand(
  command,
  log,
  args = [],
  cwd = process.cwd()
) {
  try {
    log.info(
      `Executing task-master ${command} with args: ${JSON.stringify(
        args
      )} in directory: ${cwd}`
    );

    // Prepare full arguments array
    const fullArgs = [command, ...args];

    // Common options for spawn
    const spawnOptions = {
      encoding: "utf8",
      cwd: cwd,
    };

    // Execute the command using the global task-master CLI or local script
    // Try the global CLI first
    let result = spawnSync("task-master", fullArgs, spawnOptions);

    // If global CLI is not available, try fallback to the local script
    if (result.error && result.error.code === "ENOENT") {
      log.info("Global task-master not found, falling back to local script");
      result = spawnSync("node", ["scripts/dev.js", ...fullArgs], spawnOptions);
    }

    if (result.error) {
      throw new Error(`Command execution error: ${result.error.message}`);
    }

    if (result.status !== 0) {
      // Improve error handling by combining stderr and stdout if stderr is empty
      const errorOutput = result.stderr
        ? result.stderr.trim()
        : result.stdout
        ? result.stdout.trim()
        : "Unknown error";
      throw new Error(
        `Command failed with exit code ${result.status}: ${errorOutput}`
      );
    }

    return {
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    log.error(`Error executing task-master command: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Creates standard content response for tools
 * @param {string} text - Text content to include in response
 * @returns {Object} - Content response object
 */
export function createContentResponse(text) {
  return {
    content: [
      {
        text,
        type: "text",
      },
    ],
  };
}

/**
 * Creates error response for tools
 * @param {string} errorMessage - Error message to include in response
 * @returns {Object} - Error content response object
 */
export function createErrorResponse(errorMessage) {
  return {
    content: [
      {
        text: errorMessage,
        type: "text",
      },
    ],
  };
}
