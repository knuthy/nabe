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
routes = require('./routes'),
renderer = require('./renderer'),
util = require('./utils/util'),
pages = require('./ext/pages'),
github = require('./ext/github'),
json = require('./ext/json'),
admin = require('./ext/admin');

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

// * [config](config.html)
// * [util](util.html)
// * [pages](ext/pages.html)
// * [github](ext/github.html)
nabe.config = renderer.options;
nabe.util = util;
nabe.pages = pages;
nabe.github = github;


// good ol'apache like logging
// you can customize how the log looks: 
// [http://senchalabs.github.com/connect/middleware-logger.html](http://senchalabs.github.com/connect/middleware-logger.html)
nabe
  .use(connect.logger())
  
  .use(connect.bodyParser())

  // **router module, more on this [here](routes.html)**
  .use(connect.router(routes))
  
  //**pages layer, more on this [here](ext/pages.html)**
  .use(pages())
  
  //**json layer, more on this [here](ext/json.html)**
  .use(json( {foo: 'bar'} ))
  
  // admin layer
  .use('/admin', connect.basicAuth(admin.authenticate))
  .use('/admin', admin())
  .use('/admin', connect.static(Path.join(__dirname, 'ext', 'admin', 'public')))
      
  // set to the `public` folder in themes.
  .use(connect.static(Path.join(process.cwd(), nabe.config.themeDir, nabe.config.theme, 'public'), {
    
    // set your cache maximum age, in milliseconds.
    // if you don't use cache break use a smaller value
    
    // maxAge is set to one month
    maxAge: 1000 * 60 * 60 * 24 * 30
  }))
  
  // if no routes matching, returns 404 page
  .use(function(req, res, next){
    renderer.render('page.404.html', res, {
      error: '404 Not found', 
      headers: req.headers, content: util.toHtml('tmpl.page.404.html', {config: renderer.options})
    });
  })
  .use(connect.errorHandler({
    stack: true,
    message: true,
    dump: false
  }));

// ### Error handling

// this is a failsafe, it will catch the error silently and logged it the console.
// While this works, you should really try to catch the errors with a try/catch block
// more on this [here](http://nodejs.org/docs/v0.4.7/api/process.html#event_uncaughtException_)

// sync methods in node throw exceptions, and async method pass the error
// as the first argument. This is also the pattern used in connect. Try to avoid try/catch block
// in your code, especially if it is async code. More 
// [on](https://groups.google.com/d/topic/nodejs/W9UVJCKcJ7Q/discussion)
// [this](https://groups.google.com/d/msg/nodejs/W9UVJCKcJ7Q/rzseRbourCUJ)
// [here](https://groups.google.com/d/msg/nodejs/W9UVJCKcJ7Q/oYoCP_3vvpYJ).
process.on('uncaughtException', function (err) {
   console.log('Caught exception: ' + err.stack);
});
