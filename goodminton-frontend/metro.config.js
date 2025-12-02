/**
 * Metro configuration customized to keep the dev server stable on large projects.
 *
 * - Bumps the default EventEmitter listener limit so Metro can register
 *   file watchers without throwing MaxListenersExceededWarning.
 * - Reduces the number of worker threads which also lowers the number of
 *   listeners that Metro attaches to the file map, preventing runaway growth
 *   that eventually results in V8 OOM crashes.
 */
const { getDefaultConfig } = require("expo/metro-config");
const os = require("os");

// Allow Metro to register more than 1000 listeners without warning.
require("events").EventEmitter.defaultMaxListeners = 2048;

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  // Leave one core free so macOS has headroom and Metro does not spawn
  // unnecessary extra watchers.
  maxWorkers: Math.max(1, os.cpus().length - 1),
};

module.exports = config;
