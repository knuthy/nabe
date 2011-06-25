// pages, such as home, about, etc. go in the `templates/pages` folder. 
// It basically allows one to render a simple `about.html` to `/about` url. 

// One can easily add pages just by creating new files in `pages` folder.

var connect = require('connect'),
fs = require('fs'),
util = require('../../utils/util'),
renderer = require('../../renderer');

// ## Pages layer
// A custom connect layer. It exports a function to be passed in a `use` call.
// This function returns a connect.router with the following
// available
var pages = module.exports = function pages(o) {
  
  console.log('init pages layer > ', o);
  
  return connect.router(function(app) {
    
    // ### `GET /:filename`
    // returns page file in the `templates/pages` directory.
    app.get('/:file', function(req, res, next) {
        var url = req.url,
        file = 'page.' + req.params.file + '.html',
        tmpl = 'tmpl.' + file,
        hasTmpl = util.hasTmpl(tmpl);
        
        // if requested page does not exist, pass control
        // to the next middleware in the stack
        if(!hasTmpl) {return next();}
        
        // render file and end response
        renderer.render(file, res, {headers: req.headers, content: util.toHtml(tmpl, {
          config: renderer.options
        })});
    });
    
  });
};