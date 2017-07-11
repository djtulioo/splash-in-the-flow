(function() {
    'use strict';

    angular.module('appServices').factory('UrlService', UrlService);

	function UrlService() {
		var isProduction = false;

		var local = {
			apiRest: 'http://localhost:8080',
			eventSource: 'http://localhost:9090',
			socket: 'http://localhost:8000',
		};

		var production = {
			apiRest: 'http://45.55.84.202:8080',
			eventSource: 'http://45.55.84.202:9090',
			socket: 'http://45.55.84.202:8000',
		};

		var obj = isProduction?production:local;

		return {
			apiRest: function(path){
				if(!path) path = '';
				return obj.apiRest + path;
			},
			eventSource: function(path){
				if(!path) path = '';
				return obj.eventSource + path;
			},
			socket: function(path){
				if(!path) path = '';
				return obj.socket + path;
			} 
		};
	}

})();
