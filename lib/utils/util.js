//  This files define a basic set of utility methods.
// It namely acts as a facade towards several external dependencies
// such as
//
// * [jqtpl](https://github.com/kof/node-jqtpl)
// * [pretiffy](http://code.google.com/p/google-code-prettify/)
// * [github-flavored-markdown](https://github.com/isaacs/github-flavored-markdown)
// * [jquery-global](https://github.com/jquery/jquery-global)
//

var fs = require('fs'),
qs = require('querystring'),
jqtpl = require('jqtpl'),
prettify = require('prettify'),
ghm = require('github-flavored-markdown'),
jqg = require('jquery-global'),

path = process.cwd(),
config = require('../config'),

// ### compile(file)
// Private helper which takes care of compiling templates for later use
compile = function compile(file) {
  fs.readFile(file, 'utf8', function(err, tmpl) {
    if (err) throw err;
    
    // templates are registered as `tmpl.filename.ext` or `tmpl.page.filename.ext`
    file = 'tmpl.' + ( /\/pages\//.test(file) ? 'page.' : '' ) + file.split('/').reverse()[0];
    if(jqtpl.template[file]) {
      delete jqtpl.template[file]; 
    }
    
    jqtpl.template(file, tmpl);
  }); 
},

// ### fileChange(file)
// Private helper which compare prev/curr mtime and call compile function
// when appropriate
fileChange = function(file) { return function fileChange(curr, prev) {
  if(+curr.mtime !== +prev.mtime) {
    compile(file); 
  }
}};

// ## Helpers & Setup
module.exports = {
  
  // ### .markdown(markdown)
  // markdown helper, delegates to [github-flavored-markdown module](https://github.com/isaacs/github-flavored-markdown)
  // > To get the sha/issue/fork links, pass in a second argument specifying 
  // the current project that things should be relative to.
  //
  // `ghm.parse("I **love** GHM.\n\n#2", "isaacs/npm")`
  markdown: function toHtml() {
    return ghm.parse.apply(this, arguments);
  },

  // ### .toHtml(template, data)
  // template helper, delegates to registered template engine.
  // template parameter is the key value of the template file registered using addTemplate.
  toHtml: function(template, data) {
    return jqtpl.tmpl.apply(this, arguments);
  },
  
  // ### .hasTmpl(template)
  hasTmpl: function(template) {
    return !!jqtpl.template[template];
  },
  
  // ### .pretiffy(str)
  // prettify helper, replace each code snippets with syntax highlighted one. 
  // delegated to [pretiffy](http://code.google.com/p/google-code-prettify/)
  prettify: function(str) {
    return str.replace(/<pre><code>[^<]+<\/code><\/pre>/g, function (code) {
      code = code.match(/<code>([\s\S]+)<\/code>/)[1];
      code = prettify.prettyPrintOne(code);
      return "<pre><code>" + code + "</code></pre>";
    });
  },
  
  // ### .parseProps(markdown)
  // metadata helper, it returns an object matching properties and values defined
  // on top of each post file.
  parseProps: function parseProps(markdown) {
    var props = {},
    match = [];

    while( (match = markdown.match(/^([a-z]+):\s*(.*)\s*\n/i)) ) {
      var name = match[1].toLowerCase(),
          value = match[2];
          
      markdown = markdown.substr(match[0].length);
      props[name] = value;
    }
    
    props.markdown = markdown;

    if(props.categories !== undefined) {
      props.categories = props.categories.split(',').map(function(element){ 
        return qs.escape(element.trim());
      });
    }
    
    return props;
  },
  
  // ### .extractProps(markdown)
  // a simple helper that removes meta properties and returns post content
  extractProps: function extractProps(markdown){
    var pos = markdown.indexOf('\n\n');
    // also handle special dos line ending
    pos = pos === -1 ? markdown.indexOf('\r\n\r\n') : pos;
    
    return markdown.substr(pos);
  },
  
  // ### .parseDate(date, format, culture)
  // date format helper, done thanks to [jquery.global plugin](https://github.com/jquery/jquery-global)
  // ported to node.
  parseDate: function(date, format, culture) {
    format = format || config.format;
    culture = culture || config.culture;
    
    // returns a localized date, depending on format
    // and culture provided
    return jqg.format(new Date(date), format, culture);
  },
  
  // ### .toLocaleMonth(month)
  // simple helper useful for archives case where we need a way 
  // to return the MMM(Jan, Feb) equivalent of a mm(01, 02, 03) month.
  toLocaleMonth: function toLocaleMonth(month) {
    var d = new Date(), m;
    d.setMonth(month - 1);
    m = ("" + d).match(/[a-z]{3}\s([a-z]{3})\s[\d]{2}\s[\d]{4}/i);
    return m && m[1] ? m[1] : '';
  },
  
  // ### .addTemplate(file)
  // compile template file for later use, also register
  // to file changes to automatically recompile them
  addTemplate: function addTemplate(file) {
    compile(file);
    fs.watchFile(file, fileChange(file));
  },
  
  // ### .extend(obj, *sources)
  // Extend a given object with all the properties in passed-in object(s).
  // coming from _[underscore](http://documentcloud.github.com/underscore/#extend)_
  extend: function extend(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source){
      for (var prop in source) {
        if (source[prop] !== undefined) obj[prop] = source[prop];
      }        
    });
    
    return obj;
  },
  
  buffer: function(input) {
    var buffer = new Buffer(Buffer.byteLength(input));
    buffer.write(input, 'utf8');
    return buffer;
  }
};