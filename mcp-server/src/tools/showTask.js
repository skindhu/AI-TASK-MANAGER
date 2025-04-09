/**
 * tools/showTask.js
 * Tool to show detailed information about a specific task
 */

import { z } from "zod";
import {
  executeTaskMasterCommand,
  createContentResponse,
  createErrorResponse,
} from "./utils.js";

/**
 * Register the showTask tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerShowTaskTool(server) {
  server.addTool({
    name: "showTask",
    description: "Show detailed information about a specific task",
    parameters: z.object({
      id: z.string().describe("Task ID to show"),
      file: z.string().optional().describe("Path to the tasks file"),
      projectRoot: z
        .string()
        .describe(
          "Root directory of the project (default: current working directory)"
        ),
    }),
    execute: async (args, { log }) => {
      try {
        log.info(`Showing task details for ID: ${args.id}`);

        const cmdArgs = [`--id=${args.id}`];
        if (args.file) cmdArgs.push(`--file=${args.file}`);

        const projectRoot = args.projectRoot;

        const result = executeTaskMasterCommand(
          "show",
          log,
          cmdArgs,
          projectRoot
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        return createContentResponse(result.stdout);
      } catch (error) {
        log.error(`Error showing task: ${error.message}`);
        return createErrorResponse(`Error showing task: ${error.message}`);
      }
    },
  });
}
