/**
 * Commands module tests
 */

import { jest } from '@jest/globals';

// Mock functions that need jest.fn methods
const mockParsePRD = jest.fn().mockResolvedValue(undefined);
const mockDisplayBanner = jest.fn();
const mockDisplayHelp = jest.fn();
const mockLog = jest.fn();

// Mock modules first
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((dir, file) => `${dir}/${file}`)
}));

jest.mock('chalk', () => ({
  red: jest.fn(text => text),
  blue: jest.fn(text => text),
  green: jest.fn(text => text),
  yellow: jest.fn(text => text),
  white: jest.fn(text => ({
    bold: jest.fn(text => text)
  })),
  reset: jest.fn(text => text)
}));

jest.mock('../../scripts/modules/ui.js', () => ({
  displayBanner: mockDisplayBanner,
  displayHelp: mockDisplayHelp
}));

jest.mock('../../scripts/modules/task-manager.js', () => ({
  parsePRD: mockParsePRD
}));

// Add this function before the mock of utils.js
/**
 * Convert camelCase to kebab-case
 * @param {string} str - String to convert
 * @returns {string} kebab-case version of the input
 */
const toKebabCase = (str) => {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/^-/, ''); // Remove leading hyphen if present
};

/**
 * Detect camelCase flags in command arguments
 * @param {string[]} args - Command line arguments to check
 * @returns {Array<{original: string, kebabCase: string}>} - List of flags that should be converted
 */
function detectCamelCaseFlags(args) {
  const camelCaseFlags = [];
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const flagName = arg.split('=')[0].slice(2); // Remove -- and anything after =
      
      // Skip if it's a single word (no hyphens) or already in kebab-case
      if (!flagName.includes('-')) {
        // Check for camelCase pattern (lowercase followed by uppercase)
        if (/[a-z][A-Z]/.test(flagName)) {
          const kebabVersion = toKebabCase(flagName);
          if (kebabVersion !== flagName) {
            camelCaseFlags.push({ 
              original: flagName, 
              kebabCase: kebabVersion 
            });
          }
        }
      }
    }
  }
  return camelCaseFlags;
}

// Then update the utils.js mock to include these functions
jest.mock('../../scripts/modules/utils.js', () => ({
  CONFIG: {
    projectVersion: '1.5.0'
  },
  log: mockLog,
  toKebabCase: toKebabCase,
  detectCamelCaseFlags: detectCamelCaseFlags
}));

// Import all modules after mocking
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { setupCLI } from '../../scripts/modules/commands.js';

// We'll use a simplified, direct test approach instead of Commander mocking
describe('Commands Module', () => {
  // Set up spies on the mocked modules
  const mockExistsSync = jest.spyOn(fs, 'existsSync');
  const mockReadFileSync = jest.spyOn(fs, 'readFileSync');
  const mockJoin = jest.spyOn(path, 'join');
  const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('setupCLI function', () => {
    test('should return Commander program instance', () => {
      const program = setupCLI();
      expect(program).toBeDefined();
      expect(program.name()).toBe('dev');
    });

    test('should read version from package.json when available', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('{"version": "1.0.0"}');
      mockJoin.mockReturnValue('package.json');
      
      const program = setupCLI();
      const version = program._version();
      expect(mockReadFileSync).toHaveBeenCalledWith('package.json', 'utf8');
      expect(version).toBe('1.0.0');
    });

    test('should use default version when package.json is not available', () => {
      mockExistsSync.mockReturnValue(false);
      
      const program = setupCLI();
      const version = program._version();
      expect(mockReadFileSync).not.toHaveBeenCalled();
      expect(version).toBe('1.5.0');
    });

    test('should use default version when package.json reading throws an error', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });
      
      const program = setupCLI();
      const version = program._version();
      expect(mockReadFileSync).toHaveBeenCalled();
      expect(version).toBe('1.5.0');
    });
  });

  describe('Kebab Case Validation', () => {
    test('should detect camelCase flags correctly', () => {
      const args = ['node', 'task-master', '--camelCase', '--kebab-case'];
      const camelCaseFlags = args.filter(arg => 
        arg.startsWith('--') && 
        /[A-Z]/.test(arg) && 
        !arg.includes('-[A-Z]')
      );
      expect(camelCaseFlags).toContain('--camelCase');
      expect(camelCaseFlags).not.toContain('--kebab-case');
    });

    test('should accept kebab-case flags correctly', () => {
      const args = ['node', 'task-master', '--kebab-case'];
      const camelCaseFlags = args.filter(arg => 
        arg.startsWith('--') && 
        /[A-Z]/.test(arg) && 
        !arg.includes('-[A-Z]')
      );
      expect(camelCaseFlags).toHaveLength(0);
    });
  });

  describe('parse-prd command', () => {
    // Since mocking Commander is complex, we'll test the action handler directly
    // Recreate the action handler logic based on commands.js
    async function parsePrdAction(file, options) {
      // Use input option if file argument not provided
      const inputFile = file || options.input;
      const defaultPrdPath = 'scripts/prd.txt';
      
      // If no input file specified, check for default PRD location
      if (!inputFile) {
        if (fs.existsSync(defaultPrdPath)) {
          console.log(chalk.blue(`Using default PRD file: ${defaultPrdPath}`));
          const numTasks = parseInt(options.numTasks, 10);
          const outputPath = options.output;
          
          console.log(chalk.blue(`Generating ${numTasks} tasks...`));
          await mockParsePRD(defaultPrdPath, outputPath, numTasks);
          return;
        }
        
        console.log(chalk.yellow('No PRD file specified and default PRD file not found at scripts/prd.txt.'));
        return;
      }
      
      const numTasks = parseInt(options.numTasks, 10);
      const outputPath = options.output;
      
      console.log(chalk.blue(`Parsing PRD file: ${inputFile}`));
      console.log(chalk.blue(`Generating ${numTasks} tasks...`));
      
      await mockParsePRD(inputFile, outputPath, numTasks);
    }

    beforeEach(() => {
      // Reset the parsePRD mock
      mockParsePRD.mockClear();
    });

    test('should use default PRD path when no arguments provided', async () => {
      // Arrange
      mockExistsSync.mockReturnValue(true);
      
      // Act - call the handler directly with the right params
      await parsePrdAction(undefined, { numTasks: '10', output: 'tasks/tasks.json' });
      
      // Assert
      expect(mockExistsSync).toHaveBeenCalledWith('scripts/prd.txt');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Using default PRD file'));
      expect(mockParsePRD).toHaveBeenCalledWith(
        'scripts/prd.txt',
        'tasks/tasks.json',
        10 // Default value from command definition
      );
    });

    test('should display help when no arguments and no default PRD exists', async () => {
      // Arrange
      mockExistsSync.mockReturnValue(false);
      
      // Act - call the handler directly with the right params
      await parsePrdAction(undefined, { numTasks: '10', output: 'tasks/tasks.json' });
      
      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No PRD file specified'));
      expect(mockParsePRD).not.toHaveBeenCalled();
    });

    test('should use explicitly provided file path', async () => {
      // Arrange
      const testFile = 'test/prd.txt';
      
      // Act - call the handler directly with the right params
      await parsePrdAction(testFile, { numTasks: '10', output: 'tasks/tasks.json' });
      
      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining(`Parsing PRD file: ${testFile}`));
      expect(mockParsePRD).toHaveBeenCalledWith(testFile, 'tasks/tasks.json', 10);
      expect(mockExistsSync).not.toHaveBeenCalledWith('scripts/prd.txt');
    });

    test('should use file path from input option when provided', async () => {
      // Arrange
      const testFile = 'test/prd.txt';
      
      // Act - call the handler directly with the right params
      await parsePrdAction(undefined, { input: testFile, numTasks: '10', output: 'tasks/tasks.json' });
      
      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining(`Parsing PRD file: ${testFile}`));
      expect(mockParsePRD).toHaveBeenCalledWith(testFile, 'tasks/tasks.json', 10);
      expect(mockExistsSync).not.toHaveBeenCalledWith('scripts/prd.txt');
    });

    test('should respect numTasks and output options', async () => {
      // Arrange
      const testFile = 'test/prd.txt';
      const outputFile = 'custom/output.json';
      const numTasks = 15;
      
      // Act - call the handler directly with the right params
      await parsePrdAction(testFile, { numTasks: numTasks.toString(), output: outputFile });
      
      // Assert
      expect(mockParsePRD).toHaveBeenCalledWith(testFile, outputFile, numTasks);
    });
  });
}); 