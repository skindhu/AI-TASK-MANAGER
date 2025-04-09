/**
 * tools/listTasks.js
 * Tool to list all tasks from Task Master
 */

import { z } from "zod";
import {
  executeTaskMasterCommand,
  createContentResponse,
  createErrorResponse,
} from "./utils.js";

/**
 * Register the listTasks tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerListTasksTool(server) {
  server.addTool({
    name: "listTasks",
    description: "List all tasks from Task Master",
    parameters: z.object({
      status: z.string().optional().describe("Filter tasks by status"),
      withSubtasks: z
        .boolean()
        .optional()
        .describe("Include subtasks in the response"),
      file: z.string().optional().describe("Path to the tasks file"),
      projectRoot: z
        .string()
        .describe(
          "Root directory of the project (default: current working directory)"
        ),
    }),
    execute: async (args, { log }) => {
      try {
        log.info(`Listing tasks with filters: ${JSON.stringify(args)}`);

        const cmdArgs = [];
        if (args.status) cmdArgs.push(`--status=${args.status}`);
        if (args.withSubtasks) cmdArgs.push("--with-subtasks");
        if (args.file) cmdArgs.push(`--file=${args.file}`);

        const projectRoot = args.projectRoot;

        const result = executeTaskMasterCommand(
          "list",
          log,
          cmdArgs,
          projectRoot
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        log.info(`Listing tasks result: ${result.stdout}`, result.stdout);

        return createContentResponse(result.stdout);
      } catch (error) {
        log.error(`Error listing tasks: ${error.message}`);
        return createErrorResponse(`Error listing tasks: ${error.message}`);
      }
    },
  });
}
