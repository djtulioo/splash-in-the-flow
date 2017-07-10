var amqp = require('amqp');

var connection = amqp.createConnection({ host: 'localhost' });

// add this for better debuging
connection.on('error', function(e) {
  console.log("Error from amqp: ", e);
});

// Wait for connection to become established.
connection.on('ready', function () {
  // Use the default 'amq.topic' exchange
  var exc = connection.exchange('my-exchange', function (exchange) {
    console.log('Exchange ' + exchange.name + ' is open');
  });
});

connection.on('ready', function () {
  var chatExchange = connection.exchange('chatExchange', {'type': 'fanout'});
  setInterval(function(){
    var reply = 'olá!';
    chatExchange.publish('', reply);
  }, 1000);


  connection.queue('', {exclusive: true}, function (q) {
    //Bind to chatExchange w/ "#" or "" binding key to listen to all messages.
    q.bind('chatExchange', "");

    //Subscribe When a message comes, send it back to browser
    q.subscribe(function (message) {
      console.log('chegou: '+message.data);
    });
  });

});

setTimeout(function(){
  connection.disconnect();
}, 5000);
















// var amqpClient = require('pub-sub-amqp');
 
//  var i = 0;
// new amqpClient({ uri: 'amqp://localhost', exchange: 'chat'}, function (err, e) {
 
//     // e.on('testChat', function (err, event) {
//     //   console.log('testChat: '+ event.data.some);
//     // }); 

//     e.on('', function (err, event) {
//       console.log('testeChat2: '+ event.data.some);
//     });

//     setInterval(function(){
//       e.emit('', { some: 'mudei '+ (i++) });
//     }, 2000);
// });


 
// var amqpClient = require('pub-sub-amqp');
 
// var i = 0;
// new amqpClient({ uri: 'amqp://localhost', exchange: 'chat-new'}, function (err, e) {
 
//     e.on('', function (err, event) {
//       console.log('sala - empty: '+ event.data.some );
//     });

//     e.on('sala1', function (err, event) {
//       console.log('sala - 1: '+ event.data.some );
//     });

//     e.on('sala2', function (err, event) {
//       console.log('sala - 2: '+ event.data.some );
//     });

//     setInterval(function(){
//       e.emit('sala1', { some: 'mensagem '+ (i++) });
//     }, 2000);
// });


