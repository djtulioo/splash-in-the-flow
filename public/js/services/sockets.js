(function() {
    'use strict';

    angular.module('appServices').factory('socketIO', socketIO);

    socketIO.$inject = ['$rootScope', '$window'];

    function socketIO($rootScope, $window) {
        var socket,
        services = {
            init: _init,
            on: _on,
            emit: _emit,
            removeListener: _removeListener,
            disconnect: _disconnect
        };

        return services;

        function _init() {
            console.log('INIT LETS GO');
            $window.socket = io.connect('http://localhost:8000', {
                query: {
                    username: $rootScope.username
                },
                forceNew:true,
                transports:['websocket'],
            });
        }

        function _on(eventName, callback) {
            $window.socket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply($window.socket, args);
                });
            });
        }

        function _emit(eventName, data, callback) {
            $window.socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if (callback) {
                        callback.apply($window.socket, args);
                    }
                });
            });
        }
        
        function _removeListener(eventName, callback) {
            $window.socket.removeListener(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply($window.socket, args);
                });
            });
        }

        function _disconnect(callback){
            $window.socket.disconnect(function(){
                callback.apply($window.socket, args);
            });
        }
    }

})();
