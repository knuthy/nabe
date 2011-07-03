// ## Jade module

var connect = require('connect'),
fs = require('fs'),
jade = require('jade'),
Path = require('path'),
findgit = require('../../utils/findgit'),
util = require('../../utils/util');

var templates = {};

exports = module.exports = function jadeModule(o, config) {
  
  console.log('init jade layer > ', o.description);
  
  var pages = [];
  
  // add each templates found in `themeDir/theme/templates`
  findgit.find(Path.join(config.themeDir, config.theme, 'templates'))
    .on('file', function (file, stat) {
      if(!/\.jade$|\.html$/.test(file) ) {
        return;
      }
      pages.push(file);
    })
    .on('end', function end() {
      
      pages.forEach(function(page) {        
        fs.readFile(page, 'utf8', function(err, tmpl) {
          if (err) throw err;

          // templates are registered as `tmpl.filename.ext` or `tmpl.page.filename.ext`
          var tmplKey = 'tmpl.' + ( /\/pages\//.test(page) ? 'page.' : '' ) + page.split('/').reverse()[0];
          try {
            templates[tmplKey] = jade.compile(tmpl); 
          } catch(e) {
            console.log("Error compiling template: ", tmplKey, '. Will fallback to default engine.', e.message);
          }
        });
      });
    });

  return function(req, res, next) {
    return next();
  };
};


// ## util.toHtml
// monkey patch the special `util.toHmtl` method to render string using jade templates.
// outputs is built using `templates[template]` compiled function for each template registered.
var _toHtml = util.toHtml;
util.toHtml = function jadeToHtml(template, data) {

  //if we requested these files as .html then just replace it
  template = template.replace(/html$/, 'jade');

  var tmpl = templates[template], ret;
  
  // if no jade compiled function, most likely no files or tmpl compilation error
  // fallback to the default engine (jqtpl) 
  if(!tmpl) return _toHtml.apply(this, arguments);
  
  // othewise, execute cached compiled function
  return tmpl.call({}, data);
};
