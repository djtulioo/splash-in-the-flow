var restify = require('restify');

var server = restify.createServer();

server.use(restify.gzipResponse());
server.use(restify.bodyParser());

var count = 0;

server.get('/list', function(req, res, next){

    console.log(count++);

    res.send('teste: '+ count);
    next();
});


server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});

console.log('cade essa porra');