var http = require("http");
var amqp = require('amqp');
var restify = require('restify');
var redis = require('redis');
const uuidV4 = require('uuid/v4');

const sufixRedis = 20;

var dbTopics = new db('topics-'+sufixRedis);
var dbLogin = new db('login-'+sufixRedis);
var dbUsersTopic = new db('users-topic-'+sufixRedis, 10);

const _EVENTSOURCE_PORT_ = 9090;
const _WEBSOCKET_PORT_ = 8000;
const _APIREST_PORT_ = 8080;
const _APP_PORT_ = 9000;

var connect = require('connect');
var serveStatic = require('serve-static');
connect().use(serveStatic('../public')).listen(_APP_PORT_, function(){
  console.log('APP listening at http://[::]:%s', _APP_PORT_);
});

var client = redis.createClient();
var server = restify.createServer();

server.use(restify.gzipResponse());
server.use(restify.bodyParser());
server.use(restify.queryParser());

server.use(
  function crossOrigin(req,res,next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    return next();
  }
);

var clientsSE = {};
http.createServer(function(req, res) {
    var uuid = uuidV4();

    clientsSE[uuid] = res;

    console.log('EventSource: new Client (' + Object.keys(clientsSE).length + ')');

    res.writeHeader(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
    });

    res.on('finish', function () {
        delete clientsSE[uuid];
        console.log('EventSource: finish (' + Object.keys(clientsSE).length + ')');
    });
    res.on('close', function () {
        delete clientsSE[uuid];
        console.log('EventSource: close (' + Object.keys(clientsSE).length + ')');
    });

}).listen(_EVENTSOURCE_PORT_, function() {
  console.log('EVENTSOURCE listening at http://[::]:%s', _EVENTSOURCE_PORT_);
});

setInterval(function(){
    for (var uuid in clientsSE) {
        if(!clientsSE.hasOwnProperty(uuid)) continue;
        clientsSE[uuid].write("data: \n\n");
    }
}, 15*1000);

var newTopicsExchange = false;

function initTopicsExchange(){
    newTopicsExchange = new exchangeChat('newTopics', function(data){
        data = ''+data.data;
        console.log('[Exchange newTopics] new: '+ data);
        for (var uuid in clientsSE) {
            if(!clientsSE.hasOwnProperty(uuid)) continue;
            clientsSE[uuid].write("data: " + data + "\n\n");
        }
    }, function(){
        console.log('[Exchange newTopics] close');
        for (var uuid in clientsSE) {
            if(!clientsSE.hasOwnProperty(uuid)) continue;
            clientsSE[uuid].end();
        }
        newTopicsExchange = false;
        setTimeout(function(){
            initTopicsExchange();
        }, 5000);
    }, function(error){
        console.log('[Exchange newTopics] error: ' + error);
        for (var uuid in clientsSE) {
            if(!clientsSE.hasOwnProperty(uuid)) continue;
            clientsSE[uuid].end();
        }
        newTopicsExchange = false;
        setTimeout(function(){
            initTopicsExchange();
        }, 5000);
    });
}

initTopicsExchange();


server.post('/login', function(req, res, next){
    if(!req.params.username){
        res.send({status: 'error'});
        next();
        return;
    }

    // dbLogin.exists(req.params.username, function(data){
    //     if(data){
    //         res.send({status: 'error'});
    //         next();
    //         return;
    //     }

    //     console.log(data);

    //     dbLogin.add(req.params.username, function(data){
    //         res.send({status: 'success', data: data});
    //     });       
    // });
});

var _CATEGORIES_ = [
    {id: 1, name: 'PHP'}, 
    {id: 2, name: 'JavaScript'},
    {id: 3, name: 'JAVA'}, 
    {id: 4, name: 'C++'}, 
    {id: 5, name: 'Python'}, 
    {id: 6, name: 'Ruby'},
];

server.get('/categories', function(req, res, next){
    res.send(_CATEGORIES_);
    next();
});

server.get('/topics', function(req, res, next){
    dbTopics.list(function(topics){
        if(req.params.filter){
            filter = req.params.filter.split(',');
            topics = topics.filter(function(item){
                if(filter.indexOf(item.data.category) != -1)
                    return false;
                return true;
                // if(item.data.category == req.params.filter)
                //     return false;
                // return true;
            });
        }
        if(req.params.only){
            only = req.params.only.split(',');
            topics = topics.filter(function(item){
                if(only.indexOf(item.data.category) != -1)
                    return true;
                return false;
                // if(item.data.category == req.params.only)
                //     return true;
                // return false;
            });
        }

        topics.forEach(function (item){
            _CATEGORIES_.forEach(function(cat){
                if(cat.id == item.data.category){
                    item.data.category = { 'id': item.data.category, 'name': cat.name };
                    return;
                }
            });

        });

        res.send(topics);
    });
    next();
});

server.post('/topics', function(req, res, next){
    if(!req.params.topic || !req.params.category){
        res.send({status: 'error'});
        next();
        return;
    }

    var msg = {topic: req.params.topic, category: req.params.category};

    dbTopics.add(msg, function(topic){

        _CATEGORIES_.forEach(function(cat){
            if(cat.id == topic.data.category){
                topic.data.category = { 'id': topic.data.category, 'name': cat.name };
                return;
            }
        });

        newTopicsExchange && newTopicsExchange.send(JSON.stringify(topic));

        res.send({status: 'success', data: topic});
    });
    next();
});


server.get('/topics/:id', function(req, res, next){
    if(!req.params.id){
        res.send({status: 'error'});
        next();
        return;
    }
    
    dbTopics.get(req.params.id, function(topic){
        if(!topic){
            res.send({ status: 'error', topic: null});
            next();
        }

        _CATEGORIES_.forEach(function(cat){
            if(cat.id == topic.data.category){
                topic.data.category = { 'id': topic.data.category, 'name': cat.name };
                return;
            }
        });

        res.send({ status: 'success', topic: topic});
        next();
    });

});

server.get('/topics/online/:id', function(req, res, next){
    if(!req.params.id){
        res.send({status: 'error'});
        next();
        return;
    }
    
    dbTopics.get(req.params.id, function(topic){
        if(!topic){
            res.send({ status: 'error', topic: null, users: []});
            next();
        }

        _CATEGORIES_.forEach(function(cat){
            if(cat.id == topic.data.category){
                topic.data.category = { 'id': topic.data.category, 'name': cat.name };
                return;
            }
        });

        dbUsersTopic.listWhere(req.params.id, function(users){
            res.send({ status: 'success', topic: topic, users: users});
            next();
        });

    });

});


server.listen(_APIREST_PORT_, function() {
  console.log('APIREST listening at http://[::]:%s', _APIREST_PORT_);
});




var foreachList = function (arr, list, cb){
    var element = arr.pop();
    if(!element){
        return cb(list);
    }
    client.get(element, function(err, topic){
        list.push(JSON.parse(topic));
        foreachList(arr, list, cb);
    });        
}

function db(key, expire){
    this.add = function(obj, cb){
        var uuid = uuidV4();
        var temp = {id: uuid, data: obj};

        if(expire)
            client.set(key + ':'+uuid, JSON.stringify(temp), 'EX', expire);
        else
            client.set(key + ':'+uuid, JSON.stringify(temp));
        cb(temp);
    };

    this.addWhere = function(id, obj, cb){
        var uuid = uuidV4();
        var temp = {id: uuid, data: obj};

        if(expire)
            client.set(key + ':' + id + ':'+uuid, JSON.stringify(temp), 'EX', expire);
        else
            client.set(key + ':' + id + ':'+uuid, JSON.stringify(temp));
        cb(temp);
    };

    this.update = function(id, obj, cb){
        if(expire)
            client.set(key + ':'+id, JSON.stringify(obj), 'EX', expire);
        else
            client.set(key + ':'+id, JSON.stringify(obj));
        
        if(cb){
            cb(obj);
        }
    };

    this.list = function(cb){
        var list = [];
        client.keys(key + ':*', function (err, keys) {
            foreachList(keys, [], function(list){
                cb(list);
            });
        });      
    };

    this.listWhere = function(id, cb){
        var list = [];
        client.keys(key + ':' + id + ':*', function (err, keys) {
            foreachList(keys, [], function(list){
                cb(list);
            });
        });      
    };
    
    this.get = function(id, cb){
        client.get(key + ':' + id, function(err, topic){
            cb(JSON.parse(topic));
        });       
    };
    
    this.exists = function(id, cb){
        client.get(key + ':' + id, function(err, topic){
            cb(topic ? true : false );
        });       
    };

    this.del = function(id, cb){
        client.del(key + ':' + id);
        cb();
    };
};

// dbTopics.add('oi');

// dbTopics.list(function(topics){
//     console.log(topics);
//     topics.forEach(function (value, index){
//         dbTopics.del(value.id);
//     });
// });



function exchangeChat(chatId, _receive, _close, _error){

    var connection = amqp.createConnection({ host: 'localhost' });
    var chatExchange;

    connection.on('error', _error);
    connection.on('close', _close);

    this.send = function(msg){
        if(!chatExchange)
            return;

        chatExchange.publish('', msg);
    }

    this.close = function(){
        chatExchange = null;
        connection.disconnect();
    }

    connection.on('ready', function () {
        console.log('exChat: ready');
        chatExchange = connection.exchange(chatId, {'type': 'fanout'});
        connection.queue('', {exclusive: true}, function (q) {
            q.bind(chatId, "");
            q.subscribe(_receive);
        });
    });

    //on close
}


var serverWs = require('http').createServer();
var io = require('socket.io')(serverWs);
io.on('connection', function(client){
    var chatOn = false;
    var lastChatOn = false;
    var username = client.handshake.query.username;
    var chat;
    var user;
    var interval;

    console.log('new socket client');

    client.on('setChat', function(data){
        console.log('[' + username + '] set chat: ', data);
        lastChatOn = chatOn;
        if(chatOn == data)
            return;

        chatOn = data;

        if(chat && !chatOn){
            chat.send({
                action: 'remove',
                type: 'users',
                data: user
            });
            chat.close();
            clearInterval(interval);
            if(user){
                dbUsersTopic.del(lastChatOn+':'+user.id, function(){});
                user = false;
            }
            return;
        }

        chat = new exchangeChat(chatOn, function(data){
            client.emit('_onMessage', data);
        }, function(){
            console.log('[' + username + '] exchange close');
        }, function(error){
            console.log('[' + username + '] exchange error: ' + error);
        });

        setTimeout(function(){
            chat.send({
                action: 'add',
                type: 'users',
                data: user
            });
        }, 1000);

        var i = 0;

        dbUsersTopic.addWhere(chatOn, {
            username: username, 
            lastSeenAt: (new Date()).getTime(),
            cycle: i++
        }, function(u){
            user = u;
        });

        interval = setInterval(function(){
            if(user){
                user.data.lastSeenAt = (new Date()).getTime();
                user.data.cycle = i++;
                dbUsersTopic.update(chatOn+':'+user.id, user, function(){
                });
            }
        }, 5*1000); // 10s

    });

    client.on('sendChat', function(data){
        if(!chat){
            console.log('[' + username + '] send chat fail');
            return;
        }
        console.log('[' + username + ']: ' + data);
        chat.send({
            action: 'add',
            type: 'message',
            data: {
                username: username,
                text: data
            }
        });
    });

    client.on('disconnect', function(){
        console.log('[' + username + '] disconnect');
        if(chat){
            if(user){
                dbUsersTopic.del(chatOn+':'+user.id, function(){
                });
                chat.send({
                    action: 'remove',
                    type: 'users',
                    data: user
                });
            }
            chat.close();
            clearInterval(interval);
            if(user){
                user = false;
            }
        }
    });

    // client.emit('newTopic', 123131);
});
serverWs.listen(_WEBSOCKET_PORT_, function() {
  console.log('WEBSOCKET listening at http://[::]:%s', _WEBSOCKET_PORT_);
});

