(function() {
    'use strict';

    angular.module('appServices').factory('appSocket', appSocket);

    appSocket.$inject = ['$rootScope', '$window', '$state', '$timeout',  'socketIO', 'toaster'];

    function appSocket($rootScope, $window, $state, $timeout, socketIO, toaster) {
        var debug = false;
        var services = {
            initListeners: _initListeners,
            closeListeners: _closeListeners
        };
        var modalInstance;

        return services;

        function _initListeners() {
            socketIO.on('connect', connect);
            //socketIO.on('disconnect', disconnect);
            //socketIO.on('connect_error', connectionError);
            //socketIO.on('error', error);
            //socketIO.on('chat', _onChat);
        }

        function _closeListeners() {
            socketIO.removeListener('connect', connect);
            //socketIO.removeListener('disconnect', disconnect);
            //socketIO.removeListener('connect_error', connectionError);
            //socketIO.removeListener('error', error);
            //socketIO.removeListener('chat', _onChat);
        }

        function connect() {
            console.log('socket open');
            //$rootScope.$broadcast('socket_open', true);
        }

        function disconnect() {
        }

        function connectionError(err) {
        }

        function error(err) {
        }


    }

})();