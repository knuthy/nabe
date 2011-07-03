// **nabe** is a git-powered, minimalist blog engine for coders.
//
// A simple (but yet another) blog engine written in node. It basically 
// takes the articles/ folder full of markdown post and serves them as a website.
//
// Posts are passed through [Markdown](http://daringfireball.net/projects/markdown/syntax), 
// and snippets of code is passed through [Prettify](http://code.google.com/p/google-code-prettify/) 
// syntax highlighting. This page is the result of running [Docco](http://jashkenas.github.com/docco/) 
// against its own source files.
//
// The [source for this blog engine](http://github.com/mklabs/nabe) is available on GitHub.
//
// This project respectfully uses code from and thanks the authors of:
//
// * [connect](https://github.com/senchalabs/connect)
// * [wheat](https://github.com/creationix/wheat)
// * [github-flavored-markdown](https://github.com/isaacs/github-flavored-markdown)
// * [git-fs](https://github.com/creationix/node-git)
// * [jquery-global](https://github.com/jquery/jquery-global)
// * [jqtpl](https://github.com/kof/node-jqtpl)
// * [yaml](https://github.com/visionmedia/js-yaml)
// * [h5b-server-config for node](https://github.com/paulirish/html5-boilerplate-server-configs/blob/master/node.js)

// ## Connect server 
//
// This file comes with a basic server configuration and is based on 
// [h5b-server-config for node](https://github.com/paulirish/html5-boilerplate-server-configs/blob/master/node.js)
var mime = require('mime'),
connect = require('connect'),
Path = require('path'),
fs = require('fs'),
routes = require('./routes'),
renderer = require('./renderer'),
util = require('./utils/util');

// ### Mimes configuration
// Define early so that connects sees them
mime.define({
    'application/x-font-woff': ['woff'],
    'image/vnd.microsoft.icon': ['ico'],
    'image/webp': ['webp'],
    'text/cache-manifest': ['manifest'],
    'text/x-component': ['htc'],
    'application/x-chrome-extension': ['crx']
});


// ### Create and expose the server
var nabe = module.exports = connect();

// ### Expose internal tools, helpers and additional layers
nabe.config = renderer.options;


// ## Main stack

// A logger with default config, bodyParser, and core router.
nabe
  .use(connect.logger())
  
  .use(connect.bodyParser())

  // **router module, more on this [here](routes.html)**
  .use(connect.router(routes));
  
// ## Modules loading

// Any directory in lib/ext is itself an npm package which main entry must expose
// a valid connect layer. Modules are mounted on a route matching either a config 
// property in package.json (config.path) or the name of the module directory itself.

// Modules can expose assets too by putting them in module/public directory.

(function() {
  var path = Path.join(__dirname, 'ext/');
  
  // sync is ok there since we load once on startup
  fs.readdirSync(path).forEach(function (filename) {
    var modulePath = Path.join(path, filename),
    isDir = fs.statSync(modulePath).isDirectory(),
    stack = [], pkg, config, module, middleware;
    
    if (!isDir) {
      return;
    }
    
    // A simple way to check if the module is enabled:
    // Even if the module is not in thelist of modules we leave
    // we should add the module into a list so we can enable it later
    if(!nabe.config.plugins[filename]){
      console.error('Module disabled -> ', filename );
      return;
    }     
    // build up the stack
    try {
      module = require(modulePath);
      pkg = JSON.parse(fs.readFileSync(Path.join(modulePath, 'package.json')), 'utf8');
      config = pkg.config;
      config.description = pkg.description;
      
      // init the middleware
      middleware = module.call(module, config, nabe.config);
      
      // build up the stack, eventually with any before/after layer
      stack = module.before ? stack.concat(module.before) : stack;
      stack = stack.concat(middleware);
      stack = module.after ? stack.concat(module.after) : stack;
    } catch(e) {
      console.error('Cannot get module -> ', filename, '. Error: ', e.message);
    }
    
    // register our new stack to connect, mounted on `config.path`
    nabe.use.apply(nabe, [].concat(
      config && config.path ? config.path : filename,
      stack,
      connect.static(Path.join(modulePath, 'public'))
    ));
  });
  
})();


nabe
  // set to the `public` folder in themes.
  .use(connect.static(Path.join(process.cwd(), nabe.config.themeDir, nabe.config.theme, 'public'), {

    // set your cache maximum age, in milliseconds.
    // if you don't use cache break use a smaller value

    // maxAge is set to one month
    maxAge: 1000 * 60 * 60 * 24 * 30
  }));
  

// ### Error handling
// 404 - if no routes matching, returns 404 page
nabe
  .use(function(req, res, next){
    renderer.render('page.404.html', req, res, {
      error: '404 Not found', 
      headers: req.headers, content: util.toHtml('tmpl.page.404.html', {config: renderer.options})
    });
  })
  .use(connect.errorHandler({
    stack: true,
    message: true,
    dump: false
  }));


// this is a failsafe, it will catch the error silently and logged it the console.
// While this works, you should really try to catch the errors with a try/catch block
// more on this [here](http://nodejs.org/docs/v0.4.7/api/process.html#event_uncaughtException_)
process.on('uncaughtException', function (err) {
   console.log('Caught exception: ' + err.stack);
});
