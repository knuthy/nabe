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
moduleLoader = require('./module'),
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
moduleLoader(nabe.config).forEach(function(stack) {
  nabe.use.apply(nabe, stack);
});

// ## Template middleware

// Takes `req.data` and render a response using `req.tmpl` file, eventually forced to
// not being layout-decorated using `req.force`

nabe.use(function render(req, res, next) {
  if(!req.data || !req.tmpl) return next();
  
  var target = req.tmpl,
  data = req.data,
  force = req.force,
  partial, layout, buffer;
  
  // set up config hash in data passed in
  data.config = nabe.config;
  
  // this is where we fire the single response hook, right before templating and response end.
  nabe.emit('nabe.render', req, res, data);
  
  // if any listener have ended the response, prevent default behaviour.
  if(res.finished) {return;}
  
  // force argument when set to true prevent template from being decorated with `layout.html`
  // (useful in the case of `feed.xml`)
  partial = util.toHtml('tmpl.' + target, data);
  layout = !force ? util.toHtml('tmpl.layout.html', {context: data, content: partial}) : partial;
  
  // prettify snippets of code
  layout = util.prettify(layout);
  
  // with feeds, the ' escape made it non valid feed.
  layout = layout.replace(/&#39/g, "'");
  
  buffer = util.buffer(layout);
  
  res.writeHead(200, {
    'Content-Type': /\.xml/.test(target) ? 'application/rss+xml' : 'text/html',
    'Content-Length': buffer.length
  });
  
  res.end(buffer);
});


nabe
  // set to the `public` folder in themes.
  .use(connect.static(Path.join(process.cwd(), nabe.config.themeDir, nabe.config.theme, 'public'), {

    // set your cache maximum age, in milliseconds.
    // if you don't use cache break use a smaller value

    // maxAge is set to one month
    maxAge: 1000 * 60 * 60 * 24 * 30
  }));

// ### Error handling
nabe
  .use(function(req, res, next) {
    var layout = util.toHtml('tmpl.layout.html', {
      context: {config: nabe.config},
      content: util.toHtml('tmpl.page.404.html', {error: '404 :('})
    }),
    buffer = util.buffer(layout);
    
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Content-Length': buffer.length
    });

    res.end(buffer);
  })
  .use(connect.errorHandler({
    stack: true,
    message: true,
    dump: false
  }));


// this is a failsafe, it will catch the error silently and log it to the console.
// While this works, you should really try to catch the errors with a try/catch block
// more on this [here](http://nodejs.org/docs/v0.4.7/api/process.html#event_uncaughtException_)
process.on('uncaughtException', function (err) {
   console.log('Caught exception: ' + err.stack);
});
