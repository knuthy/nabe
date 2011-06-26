var fs = require('fs'),
ChildProcess = require('child_process'),
git = module.exports = require('git-fs');

var gitENOENT = /fatal: (Path '([^']+)' does not exist in '([0-9a-f]{40})'|ambiguous argument '([^']+)': unknown revision or path not in the working tree.)/;


// helper to talk to the git subprocess, coming from git-fs (not exposed by default)
git.exec = function exec(commands, callback) {
  var child = ChildProcess.spawn("git", commands);
  var stdout = [], stderr = [];
  child.stdout.setEncoding('binary');
  child.stdout.addListener('data', function (text) {
    stdout[stdout.length] = text;
  });
  child.stderr.addListener('data', function (text) {
    stderr[stderr.length] = text;
  });
  child.addListener('exit', function (code) {
    var out = stdout.join('');
    if (code > 0 && out && !/nothing\sto\scommit/.test(out)) {
      return callback(new Error("git " + commands.join(" ") + "\n" + out));
    }
    callback(null, stdout.join(''));
  });
  child.stdin.end();
};


git.commit = function commit(file, message, callback) {  
  var args = ['add', file],
  out = "",
  self = this;
  
  this.exec(args, function(err, text) {
    if(err) { return callback(err); }
    out += text;    
    self.exec(['commit', file, '-m', message], function(err, text) {
      if(err) { return callback(err); }
      out += text;
      callback(null, out);
    });
  });
};

git.grep = function grep(term, where, callback) {
  var args = ['grep', '-i', '--name-only', '-E', '-w'];
  
  if(arguments.length === 2) {
    callback = where;
    where = null;
  }
  
  args = where ? args.concat(term, '--', where) : args.concat(term);
  
  this.exec(args, function(err, text) {
    var files = [];
    if (err) { return callback(err); }
    if(!text) { return callback(null, []); }
    
    text.split(/\n|\r\n/).forEach(function(file, i) {
      files[i] = file;
    });
    
    callback(err, files);
  });
};