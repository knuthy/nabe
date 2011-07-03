// ## Stylus module

var connect = require('connect'),
fs = require('fs'),
stylus = require('stylus'),
Path = require('path'),
findgit = require('../../utils/findgit');


// ## Stylus layer
// A custom connect layer. The layer handler doesn't do much (simple next() call). Stylus generation is
// once on module startup.

var styl = module.exports = function styl(o, config) {
  
  console.log('init stylus layer > ', o.description);

  // generate .css files from .Styl
  findgit.find(Path.join(Path.join(config.themeDir, config.theme, 'public', 'css')))
    .on('file', function(file, stat){
      if( !(/\.styl$/.test(file)) ) {
        return;
      }
      
      styl.generate(file);
    });
  
  return function(req, res, next) {
    return next();
  };
};

// ### stylus.generate
// generate Stylus files on module startup.
// any .stylus files inside /public/css is processed.
styl.generate = function generate(file) {
  console.log('Generate stylus for ', file);
  fs.readFile(file, 'utf8', function(err, str) {
    stylus(str)
      .set('filename', file)
      .set('compress', true)
      .render(function(err, css) {
        var cssFile = file.replace(".styl", ".css");

        fs.unlink(cssFile, function (err) {
          if (err) { return;}
          console.log('successfully deleted '+cssFile);
        });
      
        fs.writeFile(cssFile, css, function(err) {
          console.log("Created: "+cssFile);
        });
    });
  });
};
