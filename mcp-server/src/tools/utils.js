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
      `Executing task-manager ${command} with args: ${JSON.stringify(
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

    // Execute the command using the global task-manager CLI or local script
    // Try the global CLI first
    let result = spawnSync("task-manager", fullArgs, spawnOptions);

    // If global CLI is not available, try fallback to the local script
    if (result.error && result.error.code === "ENOENT") {
      log.info("Global task-manager not found, falling back to local script");
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
    log.error(`Error executing task-manager command: ${error.message}`);
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

/**
 * Extracts the project root path from the FastMCP session object.
 * @param {Object} session - The FastMCP session object.
 * @param {Object} log - Logger object.
 * @returns {string|null} - The absolute path to the project root, or null if not found.
 */
export function getProjectRootFromSession(session, log) {
	try {
		// Add detailed logging of session structure
		log.info(
			`Session object: ${JSON.stringify({
				hasSession: !!session,
				hasRoots: !!session?.roots,
				rootsType: typeof session?.roots,
				isRootsArray: Array.isArray(session?.roots),
				rootsLength: session?.roots?.length,
				firstRoot: session?.roots?.[0],
				hasRootsRoots: !!session?.roots?.roots,
				rootsRootsType: typeof session?.roots?.roots,
				isRootsRootsArray: Array.isArray(session?.roots?.roots),
				rootsRootsLength: session?.roots?.roots?.length,
				firstRootsRoot: session?.roots?.roots?.[0]
			})}`
		);

		// ALWAYS ensure we return a valid path for project root
		const cwd = process.cwd();

		// If we have a session with roots array
		if (session?.roots?.[0]?.uri) {
			const rootUri = session.roots[0].uri;
			log.info(`Found rootUri in session.roots[0].uri: ${rootUri}`);
			const rootPath = rootUri.startsWith('file://')
				? decodeURIComponent(rootUri.slice(7))
				: rootUri;
			log.info(`Decoded rootPath: ${rootPath}`);
			return rootPath;
		}

		// If we have a session with roots.roots array (different structure)
		if (session?.roots?.roots?.[0]?.uri) {
			const rootUri = session.roots.roots[0].uri;
			log.info(`Found rootUri in session.roots.roots[0].uri: ${rootUri}`);
			const rootPath = rootUri.startsWith('file://')
				? decodeURIComponent(rootUri.slice(7))
				: rootUri;
			log.info(`Decoded rootPath: ${rootPath}`);
			return rootPath;
		}

		// Get the server's location and try to find project root -- this is a fallback necessary in Cursor IDE
		const serverPath = process.argv[1]; // This should be the path to server.js, which is in mcp-server/
		if (serverPath && serverPath.includes('mcp-server')) {
			// Find the mcp-server directory first
			const mcpServerIndex = serverPath.indexOf('mcp-server');
			if (mcpServerIndex !== -1) {
				// Get the path up to mcp-server, which should be the project root
				const projectRoot = serverPath.substring(0, mcpServerIndex - 1); // -1 to remove trailing slash

				// Verify this looks like our project root by checking for key files/directories
				if (
					fs.existsSync(path.join(projectRoot, '.cursor')) ||
					fs.existsSync(path.join(projectRoot, 'mcp-server')) ||
					fs.existsSync(path.join(projectRoot, 'package.json'))
				) {
					log.info(`Found project root from server path: ${projectRoot}`);
					return projectRoot;
				}
			}
		}

		// ALWAYS ensure we return a valid path as a last resort
		log.info(`Using current working directory as ultimate fallback: ${cwd}`);
		return cwd;
	} catch (e) {
		// If we have a server path, use it as a basis for project root
		const serverPath = process.argv[1];
		if (serverPath && serverPath.includes('mcp-server')) {
			const mcpServerIndex = serverPath.indexOf('mcp-server');
			return mcpServerIndex !== -1
				? serverPath.substring(0, mcpServerIndex - 1)
				: process.cwd();
		}

		// Only use cwd if it's not "/"
		const cwd = process.cwd();
		return cwd !== '/' ? cwd : '/';
	}
}
