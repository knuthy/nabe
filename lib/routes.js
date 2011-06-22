// This file is the main router; it is loaded by the main application bootstrap file. 
//
// Generally, this file should be used only for defining routes.
//
// Actual functionality should be placed in other files that export 
// actions to trigger on routes defined here.

var config = require('./config'),

//**renderer module, more on this [here](renderer.html)**
renderer = require('./renderer');

// ## Router

// Using [connect.router](http://senchalabs.github.com/connect/middleware-router.html)
// > Provides Sinatra and Express-like routing capabilities.

// this file creates and expose the router layer to pass in the connect server.
var router = module.exports = function router(app) {
    
    // ### GET `/`
    // triggered on `/`, this is the main action. It displays a list of posts
    // sorted by most recent ones.
    app.get('/', renderer.index.bind(renderer));

    // ### GET `feed.xml`
    // triggered on `/feed.xml`. It displays a list of posts
    // sorted by most recent ones and rendered using `feed.xml` template
    // to provide a basic rss feed.
    app.get('/feed.xml', renderer.feed.bind(renderer));

    // ### GET `/tag/:tag`
    // triggered on `/tag/tag-name`. It displays a list of posts
    // sorted by most recent ones and filtered depending on the requested
    // tag (tags are defined on top of each article files using `Categories` property).
    app.get('/tag/:tag', renderer.tag.bind(renderer));
    
    // ### GET `/category/:category`
    // triggered on `/category/category-name`. It displays a list of posts
    // sorted by most recent ones and filtered depending on the requested category.
    // The list of articles in `/folder/subfolder/` can be accessed with 
    // `/category/folder/subfolder/`.
    app.get(/^\/category\/(.+)\/?/, renderer.category.bind(renderer));
    
    // ### GET `/[a-f0-9]{40}/:article`
    // revision action, called on `e3e43764c7854f5ce4c16d527ec6244a3c2a0f7d/article-name`
    // display content of article-name.markdown from git history. It basically
    // enables server to read files out of a git repository as if they were local files.
    // This is possible thanks to [node-git](https://github.com/creationix/node-git/), a thin
    // wrapper around the command-line `git` command for use inside node applications.
    app.get(/^\/([a-f0-9]{40})\/(.+)\/?/, renderer.revision.bind(renderer));

    // ### GET `/article/:article`
    // article action, called on `/article/article-name` or `/article/folder/or/subfolder/article-name`
    // display an article content along meta-data informations and git revisions.
    app.get(/^\/article\/(.+)\/?/, renderer.article.bind(renderer));
    
    // ### GET `/article`
    // this is failsafe, displays exactly the same thing than index route.
    app.get(/^\/article\/?/, renderer.index.bind(renderer));
    
    // ### POST `/search/:where`
    app.post(/^\/search\/(.+)?\/?/, renderer.search.bind(renderer));
    
    // ### GET `/archives/:where`
    // archives routes may be in the form of `/archives/2011` or 
    // `/archives/2011/05`
    app.get('/archives/:year/:month?', renderer.search.bind(renderer));
    
    // ### GET `/archives/`
    // simple list of posts that display in reverse chronological order.
    app.get('/archives', renderer.archives.bind(renderer));
    
    // ### Addition to the static provider
    // this must be the last route, it's coming directly from
    // [h5b-server-config for node](https://github.com/paulirish/html5-boilerplate-server-configs/blob/master/node.js)
    app.get('*', function(req, res, next) {
        var reqPath = req.url,
        userAgent = req.headers['user-agent'],
        reqHost = req.headers.host;
        
        if (userAgent && userAgent.indexOf('MSIE') && reqPath.match(/\.html$/) || reqPath.match(/\.htm$/)) {
          // use this header for html files, or add it as a meta tag
          // to save header bytes serve it only to IE
          res.setHeader('X-UA-Compatible', "IE=Edge,chrome=1"); 
        }

        // protect .files
        if (reqPath.match(/(^|\/)\./)) {
          return res.end("Not allowed"); 
        }

        // allow cross domain (for your subdomains)
        // disallow other domains.
        // you can get really specific by adding the file
        // type extensions you want to allow to the if statement
        if (false && reqHost && !reqHost.match(config.hostAddress)) {
          return res.end("Cross-domain is not allowed"); 
        }

        // let the static server do the rest
        next();
    });
};