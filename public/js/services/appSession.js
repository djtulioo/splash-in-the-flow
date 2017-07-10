(function() {
    'use strict';

    angular.module('appServices').factory('appSession', appSession);

    appSession.$inject = ['$rootScope', '$location', 'toaster', 'socketIO', 'appSocket'];

    function appSession($rootScope, $location, toaster, socketIO, appSocket) {
        var statusOn,
        source,
        services = {
            init: _init,
            close: _close,
        };

        return services;

        function _init(){
            if(statusOn || !$rootScope || !$rootScope.username)
                return;
            
            console.log('Init App Session');

            statusOn = true;
            $rootScope.inited = true;

            socketIO.init();
            appSocket.initListeners();

            source = new EventSource('http://localhost:9090');
            source.onmessage = function(event) {
                if(!event.data) return;
                var topic = JSON.parse(event.data);
                if(!topic) return;

                topic.interested = $rootScope.category.indexOf(topic.data.category.id) != -1;
                
                $rootScope.$emit('newTopic', topic);

                if(!topic.interested)
                    return;

                //toaster.success('Novo topico', topic.data.topic);
                var title = 'Novo: ' + topic.data.category.name;
                var body = topic.data.topic;

                var toasterId = toaster.pop({
                    type: 'success',
                    title: title,
                    body: body,
                    closeButton: true,
                    progressBar: true,
                    timeOut: 8000,
                    extendedTimeOut: 8000,
                    clickHandler: function(){
                        toaster.clear(toasterId);
                        $location.path('/index/chat/' + topic.id);
                    }
                });

                
                $rootScope.$apply();
            };
        }

        function _close(){
            if(!statusOn)
                return;

            console.log('Close App Session');
            
            statusOn = false;
            $rootScope.inited = false;

            socketIO.disconnect();
            appSocket.closeListeners();
            source.close();

        }

    }

})();
