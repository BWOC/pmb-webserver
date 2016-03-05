#!/usr/bin/env node
//var config = require('./config').config;
var extend = require('util')._extend;
var restify = require('restify');
var pmb = require('pmb');
var server = restify.createServer();
    server.use(restify.queryParser());
    server.use(restify.bodyParser());
var client = pmb.client();

// Response function
function respond(req, res, next) {
    
    // Publish message to queue
    var msg = extend({}, req.params);
    msg['_role']    = 'webserver';
    msg['_request'] = {
        id:             req.id(),
        headers:        req.headers,
        httpVersion:    req.httpVersion,
        statusCode:     req.statusCode,
        statusMessage:  req.statusMessage,
        url:            req.url,
        path:           req.path(),
        rawQuery:       req.getQuery(),
        query:          req.query,
        params:         req.params
    };
    
    var timeout = setTimeout(function(){
        timeout = false;
        res.error(400, {Error: 'pattern timeout'});
        next();
        return;
    },5000);
    
    client.send(msg, function(response, request){
        if(!timeout) {return;}
        clearTimeout(timeout);
        
        console.log("Response: ", response);
        
        var status  = (response.hasOwnProperty('status') ? response.status : 500);
        var headers = (response.hasOwnProperty('headers') ? response.headers : {});
        
        res.writeHead(status, headers);
        
        // Reveive response and return it to client
        res.end(response.response);
        next();
        return;
    });
    
}


// Request routing
server.get(/.*/, respond);
server.post(/.*/, respond);
server.put(/.*/, respond);
server.head(/.*/, respond);
server.del(/.*/, respond);


// Start server
server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
});