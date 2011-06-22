//  Provides needed interface to read blog posts from the git repo

var fs = require('fs'),
Path = require('path'),
sys = require('sys'),

config = require('../config'),
util = require('../utils/util'),
findgit = require('../utils/findgit'),
git = require('../utils/git'),

// ### sortArticles(posts)
// Private helper functions that provides sort ability.
// It basically sort files objects (must have a date prop) by most recent ones.
// It then replaces date property for each post with globalized value thanks to 
// jquery.global plugin ported to node
sortArticles = function sortArticles(options, posts) {
  posts = posts.sort(function(a, b) {
    return (Date.parse(b.date)) - (Date.parse(a.date));
  });
  
  posts.forEach(function(post) {
    post.date = util.parseDate(post.date, options.format, options.culture);
  });
  
  return posts;
},

// ### processArticles(options, files, tag, callback)
// private helper function that 
//
// * parse out the list of files
// * extract meta informations
// * parse markdown
// * and sort them by date
// 
// If the second paramters is a string, tag is assumed and only matching articles are returned.
// Otherwise, `processArticles(options, files, callback)`
//
// files are returned as an array of objects `{name, data, author, categories, markdown}`
processArticles = function processArticles(options, files, tag, callback) {
  var filecount = 0,
  ln = files.length - 1,
  abspath = options.articleDir.replace(/\/$/, ''),
  summary = options.summary,
  delim = summary.delim ? new RegExp(summary.delim) : undefined,
  arts = [];
  
  if(typeof tag == 'function' && arguments.length >= 2) {
    callback = tag;
    tag = null;
  }
  
  if(!files.length) {
    return callback(new Error('no files'));
  }
    
  files.forEach(function(file) {
    git.readFile('fs', file, function (err, body) {
      var props, sum;
      if (err) { return next(err); }

      // extract meta informations
      props = util.parseProps(body);
      
      // set post name, simply the filename minus its absolute path and extension
      props.name = file
        .replace(abspath + '/', '')
        .replace('.markdown', '');
      
      // generate markdown property, its html representation. 
      
      // summary are generated and stop on the very first `summary.delim` config occurence
      sum = delim && delim.test(props.markdown) ? props.markdown.split(delim)[0] : props.markdown;
      
      // if post content does not have a delimiter within, summary are full article.
      props.markdown = util.markdown(sum);
      
      // if we have a tag to filter on, only append files that have categories matching
      if(tag) {
        if(props.categories && props.categories.indexOf(tag) !== -1) {
          arts.push(props); 
        }
      } else {
        arts.push(props);
      }
      
      if(ln === filecount) {
        return callback(null, sortArticles(options, arts));
      }
      
      filecount++;
    });  
  });
};

var Posts = module.exports = function Posts(o) {
  var refs = Path.join(process.cwd(), ".git", "packed-refs");
  
  try {
    // Check is this is a working repo
    fs.statSync(refs);
    
    git(process.cwd());
    this.validRepo= true;

  } catch (e) {
    console.warn('not a valid repo', refs, '. No revisions for you.');
  }  
  
  // options here are the merged results of defaults `config.js` file
  // and template's `config.yml`
  this.options = o;
};

// ## Posts
// Our data source
Posts.prototype = {
  
  // ### .all(path, callback)
  // Loads all posts files
  all: function all(path, callback) {
    var files = [];

    findgit.find(path)
      .on('error', function(err){
        callback(err);
      })
      .on('file', function(file, stat) {
        // Filter out non markdown files and special ones
        if (!(/\.markdown$/.test(file)) || /_sidebar\.markdown$/.test(file)) {
          return;
        }
          
        files.push(file);
      })
      .on('end', this.handleFiles.bind(this, files, callback));
    
    return this;
  },
  
  // ### .find(path, callback)
  // Loads an article complete with log information
  find: function find(path, callback) {
    var self = this;
    
    if(!this.validRepo) {
      git.readFile('fs', path, self.handleFile.bind(self, null, path, callback));
      return this;
    }
    
    git.log(path, function(err, logs) {
      // no error handling here, if err, there was most likely no commit
      // in any case, still grab file content
      git.readFile('fs', path, self.handleFile.bind(self, logs, path, callback));
    });
    
    return this;
  },
  
  // ### .revision(path, callback)
  // alternately, if we have a version (sha), loads in an article
  // from git history. find and revision are almost identical, thus may 
  // become a single method.
  revision: function(version, file, callback) {
    var path = Path.join(config.articleDir, file + '.markdown'),
    self = this;
    
    if(!this.validRepo) {
      git.readFile('fs', path, self.handleFile.bind(self, null, path, callback));
      return this;
    }
    
    git.log(path, function(err, logs) {
      if(err) {return callback(err);}  
      git.readFile(version, path, self.handleFile.bind(self, logs, path, callback));
    });
    
    return this;
  },
  
  // ### .tags(path, tag, callback)
  // Loads the list of posts that match requested tag. posts are sorted by most recent one.
  tags: function tags(path, tag, callback) {
    var files = [];

    findgit.find(path)
      .on('file', function (file, stat) {
        if(!(/\.markdown$/.test(file))) {
          return;
        }
        
        files.push(file);
      })
      .on('end', this.handleFiles.bind(this, files, tag, callback));
      
    return this;
  },
  
  
  // ### .categories(path, filter, callback)
  // Loads the list of posts that match requested category. takes a path to scan 
  // and filter(regex) to apply to. posts are then sorted by most recent one.
  categories: function categories(path, filter, callback) {
    var files = [];
      
    findgit.find(path)
      .on('error', function(err){
        callback(err);
      })
      .on('file', function(file, stat) {
        var match = filter.test(file) && /\.markdown/.test(file);
          
        if(!match) {
          return;
        }
          
        files.push(file);
      })
      .on('end', this.handleFiles.bind(this, files, callback));
        
    return this;
  },
  
  // #### .edit(path, message, content, callback)
  // This method allows one to write to the file system, and usually used
  // to either edit or create a file, if path does not exist.
  // If successful, and the git repo is correctly set up (`.git/packed-refs` exists), 
  // a new commit is done using global configuration (eg. values defined in git config)
  edit: function(path, message, content, callback) {
    var file = Path.join(this.options.articleDir, path + '.markdown'),
    self = this;
    
    message = message || 'default message';
    
    fs.writeFile(file, content, function(err) {
      if(err) {return callback(err);}
      
      if(!self.validRepo) {
        return callback(null);
      }
      
      git.commit(file, message, function(err, text) {
        if(err) {return callback(err);}
        return callback(null, text);
      });
    }); 
  },
  
  search: function(term, where, callback) {
    var self = this;
    git.grep(term, where, function(err, files) {
      if(err || !files.length) { return callback(err, files); }
      files = files.filter(function(a) { return  (/\.markdown/).test(a) && !(/_sidebar/.test(a)); });
      self.handleFiles(files, callback);
    });
  },
  
  // ### .handleFiles(path, filter, callback)
  // expose this helper function
  handleFiles: function handleFiles (files, tag, callback) {
    processArticles(this.options, files, tag, callback);
    return this;
  },
  
  // ### .handleFile
  // convenience method. mimics `handleFiles` behaviour (meta parse, markdown, ...)
  // while setting up revisions property from git history.
  handleFile: function (logs, path, callback, err, body) {
    var props = {};
    if (err) { return callback(err); }
    
    props = util.parseProps(body);
    props.name = path
      .replace(process.cwd(), '')
      .replace(new RegExp('/?' + config.articleDir + '/?'), '')
      .replace('.markdown', '');
    
    props.markdown = body;
    props.body = util.markdown(util.extractProps(body));
    props.date = util.parseDate(props.date, this.options.format, this.options.culture);
    props.revisions = {};
    
    // globalize revisions date as well
    for(var sha in logs) {
      props.revisions[sha] = {
        author: logs[sha].author,
        message: logs[sha].message,
        date: util.parseDate(logs[sha].date, this.options.format, this.options.culture)
      };
    }
    
    callback(null, props);
    
    return this;
  }
};