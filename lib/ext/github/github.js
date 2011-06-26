var request = require('request'),
https = require('https'),
connect = require('connect'),
Path = require('path'),
ghm = require('github-flavored-markdown'),
jqtpl = require('jqtpl'),
util = require('../../utils/util');

// Expose module
exports = module.exports = function github(o) {
  console.log('init github layer > ', o.description);
  
  var projects = {};
  
  o.github.projects.forEach(function(project) {
    var p = project.split(':')[0],
    file = project.split(':')[1];
    
    projects[p] = 'https://' + Path.join('raw.github.com', o.github.user, p, 'master', file);
    
  });
  
  console.log(projects);
  util.addTemplate(Path.join(__dirname + '/github.gh.html'));
  
  return connect.router(function(app){
    
    app.get('/:project', function(req, res, next) {
      var project = req.params.project,
      tmplKey = 'tmpl.github.gh.html',
      hasTmpl = jqtpl.template[tmplKey],
      path = Path.join(o.github.user, project, 'master/README.' + o.github.ext), 
      layout, partial;
      
      console.log('project, ', project in projects);
      if(!hasTmpl || !(project in projects)) { return next(); }
      
      request({ uri: 'https://' + Path.join('raw.github.com', path)}, function(err, response, body) {
        if(err || response.statusCode !== 200) {return next(err)};
        
        var data = ghm.parse(body);
        
        partial = jqtpl.tmpl(tmplKey, {config: o, content: data, name: project});
        layout = jqtpl.tmpl('tmpl.layout.html', {context: {content: data, config: o}, content: partial});

        // prettify snippets of code
        layout = util.prettify(layout);

        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': layout.length
        });

        res.end(layout);
      });
      
    });
    
  });
};