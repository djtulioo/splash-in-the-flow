/**
 * INSPINIA - Responsive Admin Theme
 *
 */

/**
 * MainCtrl - controller
 */
function MainCtrl($rootScope, $state, appSession) {
    $rootScope.username = $rootScope.username || localStorage.getItem("username");
    $rootScope.category = $rootScope.category || localStorage.getItem("category");

    function setOn(){
        $rootScope.inited = true;
        appSession.init();

        $rootScope.$emit('connectedSocketButton', true);
    }

    function setOff(){
        $rootScope.inited = false;
        appSession.close();
    }

    $rootScope.setOn = setOn;
    $rootScope.setOff = setOff;
}
/**
 * ListsCtrl - controller
 */
function ListsCtrl($scope, $rootScope, $state, $http, $timeout, appSession, UrlService) { 
    $rootScope.username = $rootScope.username || localStorage.getItem("username");
    $rootScope.category = $rootScope.category || localStorage.getItem("category");

    if(!$rootScope.username){
        console.log('need login');
        $state.go('login');
        return;
    }

    appSession.init();

    $scope.$parent.$parent.main.userName = $rootScope.username;
    $scope.$parent.$parent.main.category = $rootScope.category;
    
    $http.get(UrlService.apiRest('/categories')).then(function(response) {
        $scope.categories = response.data;
    }, function(err) {
        console.log(err);
    });

    $rootScope.$on('newTopic', function (event, item) {
        var topic = {
            id: item.id,
            topic: item.data.topic,
            category: item.data.category,
        };

        if(item.interested){
            $scope.lists.push(topic);
        }else{
            $scope.lists_other.push(topic);
        }   

        $scope.$apply();
    });


    function list(){
        $http.get(UrlService.apiRest('/topics?filter=' + $rootScope.category)).then(function(response) {
            if(response.data){
                var lists = [];
                response.data.forEach(function(item){
                    lists.push({
                        id: item.id,
                        topic: item.data.topic,
                        category: item.data.category,
                    });
                });
                $scope.lists_other = lists;
            }
        }, function(err) {
            console.log(err);
        });

        $http.get(UrlService.apiRest('/topics?only='+ $rootScope.category)).then(function(response) {
            if(response.data){
                var lists = [];
                response.data.forEach(function(item){
                    lists.push({
                        id: item.id,
                        topic: item.data.topic,
                        category: item.data.category,
                    });
                });
                $scope.lists = lists;
            }
        }, function(err) {
            console.log(err);
        });
    }

    list();

    $scope.add = function(){
        var obj = {
            category: $scope.form_category,
            topic: $scope.form_topic,
        }

        $scope.form_category = $scope.form_topic = null;

        $http.post(UrlService.apiRest('/topics', obj)).then(function(response) {
            list();
        }, function(err) {
            console.log(err);
        });

    }


};

/**
 * ChatCtrl - controller
 */
function ChatCtrl($scope, $rootScope, $state, $window, $timeout, $http, $stateParams, appSession, toaster, UrlService) {
    $rootScope.username = $rootScope.username || localStorage.getItem("username");
    $rootScope.category = $rootScope.category || localStorage.getItem("category");

    if(!$rootScope.username){
        console.log('need login');
        $state.go('login');
        return;
    }

    appSession.init();
    
    $scope.$parent.$parent.main.userName = $rootScope.username;
    $scope.$parent.$parent.main.category = $rootScope.category;

    var chatOn;

    init();

    function init(){
        $scope.users = [];
        $scope.messages = [];
        
        shiftKey();
        scroll();

        setTopic(function(){
            initChat();
        });
    }

    function initChat(){
        console.log('Chat Inited');

        setupListeners();
        setupChat();

        listOnline();
        $timeout(function(){
            listOnline();
        }, 10000);
    }
    
    function _connectSocket(){
        initChat();
    }
    
    $scope.$on("$destroy", function() {
        closeListeners();
    });

    $rootScope.$on('connectedSocketButton', function () {
        _connectSocket();
    });

    function _disconnectSocket(){
        console.log('disconectou :|');
        chatOn = false;
    }

    function setTopic(cb){
        $http.get(UrlService.apiRest('/topics/' + $stateParams.id)).then(function(response) {
            if(response.data.status == 'success'){
                $scope.topic = response.data.topic.data.topic;
                $scope.category = response.data.topic.data.category.name;

                cb();
            }else{
                $state.go('index.main');
                return;
            }
        }, function(err) {
            console.log(err);
            $state.go('index.main');
            return;
        });
    }

    function listOnline(){
        $http.get(UrlService.apiRest('/topics/online/' + $stateParams.id)).then(function(response) {
            if(response.data.status != 'success')
                return;
            $scope.users = response.data.users;
            
        }, function(err) {
            console.log(err);
        });
    }

    function scroll(){
        $timeout(function() {
            var chatDiv = document.querySelector('.chat-discussion');
            var offset = chatDiv.scrollHeight + chatDiv.scrollHeight;
            $('.chat-discussion').slimScroll({ height: '400px', scrollTo: offset + 'px' });
        }, 0);
    }

    function sendMessage(){
        if(!$rootScope.inited)
            return;
        
        $window.socket.emit('sendChat', $scope.text);

        var message = {
            username: $rootScope.username,
            text: $scope.text
        };

        $scope.messages.push(message);

        $scope.text = '';
        scroll();
        $scope.$apply();
    }

    function shiftKey() {
        $timeout(function(){
            var elem = $('#textChat');
            elem.bind('keydown', function(event) {
                var code = event.keyCode || event.which;

                if (code === 13) {
                    if (!event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                    }
                }
            });
        }, 0);
    }

    function setupListeners() {
        closeListeners();
        $window.socket.on('connect', _connectSocket);
        $window.socket.on('disconnect', _disconnectSocket);
        $window.socket.on('_onMessage', _onMessage);
    }

    function setupChat(){
        if(chatOn == $stateParams.id)
            return;
        chatOn = $stateParams.id;
        console.log('setChat: ' + $stateParams.id);
        $window.socket.emit('setChat', $stateParams.id);
    }

    function closeListeners(){
        $window.socket.removeListener('connect', _connectSocket);
        $window.socket.removeListener('disconnect', _disconnectSocket);
        $window.socket.removeListener('_onMessage', _onMessage);
        $window.socket.emit('setChat', false);
    }

    function _onMessage(data){
        console.log(data);
        if(!data || !data.type)
            return;
        
        if(data.type == 'message'){
            var message = data.data;
            if(message.username == $rootScope.username)
                return;

            $scope.messages.push(message);
            scroll();
            $scope.$apply();
        }
        
        if(data.type == 'users' && data.action == 'add'){
            var user = data.data;
            
            var users = $scope.users;

            users.push(user);

            $scope.users = users.filter(function (item, index, self) {
                var el = _.find(users, function(obj) {
                    return obj.id == item.id 
                });
                return self.indexOf(el) == index;
            });

            if(user.data.username != $rootScope.username){
                var body = user.data.username + ' acabou de entrar';
                //var title = topic.data.topic;

                var toasterId = toaster.pop({
                    type: 'info',
                    //title: title,
                    body: body,
                    closeButton: true,
                    progressBar: true,
                    timeOut: 8000,
                    extendedTimeOut: 8000
                });
            }

            $scope.$apply();
        }      

        if(data.type == 'users' && data.action == 'remove'){
            var user = data.data;
            
            var users = $scope.users;

            users = users.filter(function(item){
                if(item.id == user.id)
                    return false;
                return true;
            });
            
            $scope.users = users.filter(function (item, index, self) {
                var el = _.find(users, function(obj) {
                    return obj.id == item.id 
                });
                return self.indexOf(el) == index;
            });

            $scope.$apply();
        }
    }
    

    $scope.sendMessage = sendMessage;

};

/**
 * LoginCtrl - controller
 */
function LoginCtrl($scope, $state, $rootScope, $http, appSession, UrlService) {
    appSession.close();

    localStorage.removeItem("username");
    localStorage.removeItem("category");

    function login(){
        localStorage.setItem("username", $scope.username);
        localStorage.setItem("category", $scope.category);

        $rootScope.username = $scope.username;
        $rootScope.category = $scope.category;
        
        appSession.init();

        $state.go('index.main');
    }

    
    $http.get(UrlService.apiRest('/categories')).then(function(response) {
        $scope.categories = response.data;
    }, function(err) {
        console.log(err);
    });

    $scope.login = login;
};

angular
    .module('inspinia')
    .controller('MainCtrl', MainCtrl)
    .controller('ListsCtrl', ListsCtrl)
    .controller('ChatCtrl', ChatCtrl)
    .controller('LoginCtrl', LoginCtrl)