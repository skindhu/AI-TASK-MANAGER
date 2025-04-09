#!/usr/bin/env node

/**
 * Claude Task Master Init
 * Direct executable for the init command
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the path to the init script
const initScriptPath = resolve(__dirname, '../scripts/init.js');

// Pass through all arguments
const args = process.argv.slice(2);

// Spawn the init script with all arguments
const child = spawn('node', [initScriptPath, ...args], {
  stdio: 'inherit',
  cwd: process.cwd()
});

// Handle exit
child.on('close', (code) => {
  process.exit(code);
}); 