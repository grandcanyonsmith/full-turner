/**
 * File utility functions
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the project root directory (where package.json is located)
 * @returns {string} - Project root directory path
 */
export function getProjectRoot() {
  // Start from the current file's directory and walk up to find package.json
  let currentDir = dirname(fileURLToPath(import.meta.url));
  
  // Walk up directories until we find package.json or reach filesystem root
  // Skip any package.json files that are just type: "module" markers
  while (currentDir !== dirname(currentDir)) {
    try {
      const pkgPath = join(currentDir, 'package.json');
      const pkgContent = readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);
      // Only return if this looks like the main package.json (has dependencies or scripts)
      if (pkg.dependencies || pkg.scripts || pkg.name === 'full-turner') {
        return currentDir;
      }
      currentDir = dirname(currentDir);
    } catch {
      currentDir = dirname(currentDir);
    }
  }
  
  // Fallback to process.cwd() if package.json not found
  return process.cwd();
}

/**
 * Read a file from the project root directory
 * @param {string} filename - Name of the file to read (relative to project root)
 * @param {string} baseDir - Base directory (defaults to project root)
 * @returns {string} - File contents as string
 */
export function readProjectFile(filename, baseDir = null) {
  const dir = baseDir || getProjectRoot();
  const filePath = join(dir, filename);
  return readFileSync(filePath, 'utf-8');
}

