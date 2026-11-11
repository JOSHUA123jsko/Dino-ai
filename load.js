/* Loads the Leon engine (classic scripts) into one shared global, in dependency order. */
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm');
var ROOT = path.join(__dirname, '..');
var ORDER = require('../tools/files.js').ENGINE;
module.exports = function load(extra) {
  var sandbox = { console: console, Date: Date, Math: Math, JSON: JSON };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  (extra ? ORDER.concat(extra) : ORDER).forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
  });
  return sandbox.Leon;
};
