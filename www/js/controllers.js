'use strict';

var tegmarkControllers = angular.module('tegmarkControllers', []);

tegmarkControllers.controller('MapCtrl', ['$scope', '$routeParams', 'World', function($scope, $routeParams, World) {
  if(typeof $routeParams.worldId !== 'undefined')
    World.get($routeParams.worldId)
      .then(function(world) {
         $scope.data = world;
         $scope.id = $routeParams.worldId;
      });
  }]);

tegmarkControllers.controller('IdCtrl', ['$scope', 'World', function($scope, World) {
  $scope.id = World.id;
  $scope.$watch(function () { return World.id }, function (newVal, oldVal) {
    if (typeof newVal !== 'undefined' && newVal != oldVal) {
      $scope.id = World.id;
      }
    });
  }]);

tegmarkControllers.controller('LocationCtrl', ['$scope', '$location', function($scope, $location) {
  $scope.active = function(page) {
    var isLocation = (page == '' && $location.url() == '/') ||
     (page !== '' && $location.url().indexOf(page) > -1);
    return (isLocation ? "active" : "");
  }
  }]);


tegmarkControllers.controller('WorldListCtrl', ['$scope', '$location', 'Worlds', function($scope, $location, Worlds) {
  $scope.worlds = Worlds.list();
  $scope.createWorld = Worlds.create;
  $scope.createAndVisitWorld = function() {
    Worlds.create().then(function(id) {
      console.log(id);
      $location.path('/world/' + id);
    });

  }

  $scope.$watch(function () { return Worlds.list() }, function (newVal, oldVal) {
    if (typeof newVal !== 'undefined' && newVal != oldVal) {
      $scope.worlds = Worlds.list();
      console.log("World list updated.");
      }
    });
  }]);

tegmarkControllers.controller('AboutCtrl', ['$scope', 'ServerDetails', function($scope, ServerDetails) {
  var server = ServerDetails;
  $scope.motd = server.getMotd();
  $scope.tegmarkVersion = server.getTegmarkVersion();
  $scope.everettVersion = server.getEverettVersion();

  $scope.$watch(function () { return server.getEverettVersion() }, function (newVal, oldVal) {
    if (typeof newVal !== 'undefined' && newVal != oldVal) {
      $scope.everettVersion = server.getEverettVersion();
      }
    });

  $scope.$watch(function () { return server.getTegmarkVersion() }, function (newVal, oldVal) {
    if (typeof newVal !== 'undefined' && newVal != oldVal) {
      $scope.tegmarkVersion = server.getTegmarkVersion();
      }
    });

  $scope.$watch(function () { return server.getMotd() }, function (newVal, oldVal) {
    if (typeof newVal !== 'undefined' && newVal != oldVal) {
      $scope.motd = server.getMotd();
      }
    });
  }]);
