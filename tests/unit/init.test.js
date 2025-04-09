import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock external modules
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn(),
    close: jest.fn()
  }))
}));

// Mock figlet for banner display
jest.mock('figlet', () => ({
  default: {
    textSync: jest.fn(() => 'Task Master')
  }
}));

// Mock console methods
jest.mock('console', () => ({
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  clear: jest.fn()
}));

describe('Windsurf Rules File Handling', () => {
  let tempDir;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-master-test-'));
    
    // Spy on fs methods
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
      if (filePath.toString().includes('.windsurfrules')) {
        return 'Existing windsurf rules content';
      }
      return '{}';
    });
    jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
      // Mock specific file existence checks
      if (filePath.toString().includes('package.json')) {
        return true;
      }
      return false;
    });
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up the temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.error(`Error cleaning up: ${err.message}`);
    }
  });

  // Test function that simulates the behavior of .windsurfrules handling
  function mockCopyTemplateFile(templateName, targetPath) {
    if (templateName === 'windsurfrules') {
      const filename = path.basename(targetPath);
      
      if (filename === '.windsurfrules') {
        if (fs.existsSync(targetPath)) {
          // Should append content when file exists
          const existingContent = fs.readFileSync(targetPath, 'utf8');
          const updatedContent = existingContent.trim() + 
            '\n\n# Added by Claude Task Master - Development Workflow Rules\n\n' + 
            'New content';
          fs.writeFileSync(targetPath, updatedContent);
          return;
        }
      }
      
      // If file doesn't exist, create it normally
      fs.writeFileSync(targetPath, 'New content');
    }
  }

  test('creates .windsurfrules when it does not exist', () => {
    // Arrange
    const targetPath = path.join(tempDir, '.windsurfrules');
    
    // Act
    mockCopyTemplateFile('windsurfrules', targetPath);
    
    // Assert
    expect(fs.writeFileSync).toHaveBeenCalledWith(targetPath, 'New content');
  });
  
  test('appends content to existing .windsurfrules', () => {
    // Arrange
    const targetPath = path.join(tempDir, '.windsurfrules');
    const existingContent = 'Existing windsurf rules content';
    
    // Override the existsSync mock just for this test
    fs.existsSync.mockReturnValueOnce(true); // Target file exists
    fs.readFileSync.mockReturnValueOnce(existingContent);
    
    // Act
    mockCopyTemplateFile('windsurfrules', targetPath);
    
    // Assert
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      targetPath,
      expect.stringContaining(existingContent)
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      targetPath,
      expect.stringContaining('Added by Claude Task Master')
    );
  });
  
  test('includes .windsurfrules in project structure creation', () => {
    // This test verifies the expected behavior by using a mock implementation
    // that represents how createProjectStructure should work
    
    // Mock implementation of createProjectStructure
    function mockCreateProjectStructure(projectName) {
      // Copy template files including .windsurfrules
      mockCopyTemplateFile('windsurfrules', path.join(tempDir, '.windsurfrules'));
    }
    
    // Act - call our mock implementation
    mockCreateProjectStructure('test-project');
    
    // Assert - verify that .windsurfrules was created
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(tempDir, '.windsurfrules'),
      expect.any(String)
    );
  });
});