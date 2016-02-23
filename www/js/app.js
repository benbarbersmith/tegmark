'use strict';

var serverUrl = "http://localhost:15000/api"

var tegmarkApp = angular.module('tegmarkApp', [
  'ngRoute',
  'tegmarkControllers',
  'tegmarkServices',
  'tegmarkDirectives'
]);

tegmarkApp.config(['$routeProvider', '$locationProvider',
  function($routeProvider, $locationProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'partials/home.html'
      }).
      when('/about', {
        templateUrl: 'partials/about.html',
        controller: 'AboutCtrl'
      }).
      when('/worlds', {
        templateUrl: 'partials/worlds.html',
        controller: 'WorldListCtrl'
      }).
      when('/world/:worldId', {
        templateUrl: 'partials/world.html',
        controller: 'WorldCtrl'
      }).
      otherwise({
        redirectTo: '/'
      });
  }]);
