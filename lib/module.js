// ## Module Loader

// Defines a custom middleware. Scans the ext/ folder for any valid npm package.
// The module entry point must expose a function which returns a valid connect layer.
//
// ex:
//    exports = modules.exports = function(moduleConfig, nabeConfig) {
//      return function(req, res, next) {
//      
//    }};
//
// usage:
// the callback function must either end the reponse, or `next()` to the following middleware.
//

// Modules are mounted on a route matching either a config 
// property in package.json (config.path) or the name of the module directory itself.

// Modules can expose assets too by putting them in module/public directory.

var Path = require('path'),
connect = require('connect'),
fs = require('fs');


var path = Path.join(__dirname, 'ext/');

exports = module.exports = function moduleLoader(o) {
  
  var mods = [];
  
  // sync is ok there since we load once on startup
  fs.readdirSync(path).forEach(function (filename) {
    var modulePath = Path.join(path, filename),
    isDir = fs.statSync(modulePath).isDirectory(),
    stack = [], pkg, config, module, moduleName;

    if (!isDir) {
      return;
    }

    // build up the stack
    try {
      module = require(modulePath);
      pkg = JSON.parse(fs.readFileSync(Path.join(modulePath, 'package.json')), 'utf8');
      config = pkg.config;
      config.description = pkg.description;

      stack = [module(config, o)];      
      module.before && stack.unshift(module.before);
      module.after && stack.push(module.before);
    } catch(e) {
      console.error('Cannot get module -> ', filename, '. Error: ', e.message);
    }
    
    mods.push([].concat(
      config && config.path ? config.path : filename,
      stack,
      connect.static(Path.join(modulePath, 'public'))
    ));
  });
  
  return mods;
};
  
