// This file defines a custom connect layer that takes care of admin feature. 
//
// It aims at providing you a clean and handy UI to edit and create new posts.

// **Markdown editor**
// a standalone markdown editor sitting between ace and showdown.

// **Git**
// Each time a file is saved or edited, a new git commit is performed. It uses the 
// global configuration for the current repo (so commit author will match git config)
//

var connect = require('connect'),
renderer = require('../../renderer'),
Posts = require('../../model/posts'),
util = require('../../utils/util'),
path = require('path');

// ## Admin layer
// A custom connect layer. It exports a function to be passed in a `use` call, generally
// prefixed with `/admin` routes. This function returns a connect.router with the following
// available
var admin = module.exports = function admin(o) {
  console.log('init admin layer > ', o.description);
  
  // templates configuration
  util.addTemplate(path.join(__dirname + '/admin.html'));
  util.addTemplate(path.join(__dirname + '/admin.index.html'));
  
  return connect.router(function(app) {
    
    // ### `GET /`
    app.get('/', function(req, res, next) {
      renderer.index(req, res, next, function(err, results) {
        if(err) { return next(err); }
        req.tmpl = 'admin.index.html';
        req.data = {articles: results};
        req.force = true;
        return next();
      });
    });
    
    // ### GET `/edit`
    // failsafe for now
    app.get('/edit', function(req, res, next) {
      renderer.index(req, res, next, function(err, results) {
        if(err) { return next(err); }
        req.tmpl = 'admin.index.html';
        req.data = {articles: results};
        req.force = true;
        return next();
      });
    });
    
    // ### `GET /edit/filename`
    // Alternately, works recursively and would match `/edit/folder/or/subfolder/pathname`
    app.get(/\/edit\/(.+)\/?/, function(req, res, next) {
      var page = req.params[0];
      renderer.article(req, res, next, function(err, article) {
        if(err) { return next(err); }
        req.tmpl = 'admin.html';
        req.data = {article: article};
        req.force = true;
        return next();
      });
    });
    
    // ### `POST /edit/filename`
    app.post(/\/edit\/(.+)\/?/, function(req, res, next) {
      var path = req.params[0];
      renderer.posts.edit(path, req.body.post.commit, req.body.post.body, function(err, text){
        if(err) { return next(err); }
        renderer.article(req, res, next, function(err, article) {
          if(err) { return next(err); }
          req.tmpl = 'admin.html';
          req.data = {article: article, msg: text || 'File saved.'};
          req.force = true;
          return next();
        });
      });
    });
    
    // ### `GET /create/filename`
    app.get(/\/create\/(.+)\/?/, function(req, res, next) {
      var page = req.params[0],
      markdown = ['Title: ' + page, 'Author: Your name', 'Date: ' + new Date()];
      
      req.tmpl = 'admin.html';
      req.data = {article: {name: page, title: page, markdown: markdown.join('\n')}, mode: 'create'};
      req.force = true;
      return next();
    });
    
    // ### POST `/search/:where`
    app.post(/\/search\/(.+)?\/?/, renderer.search.bind(renderer));
    
    // ### `POST /edit/filename`
    app.post(/\/search\/(.+)\/?/, function(req, res, next) {
      var path = req.params[0];
      renderer.posts.edit(path, req.body.post.commit, req.body.post.body, function(err, text){
        if(err) { return next(err); }
        renderer.article(req, res, next, function(err, article) {
          if(err) { return next(err); }
          req.tmpl = 'admin.html';
          req.data = {article: article, msg: text || 'File saved.'};
          req.force = true;
          return next();
        });
      });
    });
   
  });
};

// ### .authenticate(user, pass)
// simple credential assert against config

// a module can expose a set of connect layers to be executed before the request ends in a given module.
// Can either be a single connect middleware or an array of layers.
admin.before = connect.basicAuth(function authenticate(user, pass) {
  var o = renderer.options.admin;
  return o.user === user && o.pass === pass;
});

// same goes for the after stack
admin.after = [function(req, res, next){
  console.log('after 1 yeah');
  next();
}, function(req, res, next){
  console.log('after 2 yeah');
  next();
}];