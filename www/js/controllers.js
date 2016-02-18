'use strict';

var tegmarkControllers = angular.module('tegmarkControllers', []);

tegmarkControllers.controller('MapCtrl', ['$scope', '$routeParams', '$location', 'World', function($scope, $routeParams, $location, World) {
  if(typeof $routeParams.worldId !== 'undefined') {
    $scope.renderer = $location.search()['renderer'] || "canvas";
    $scope.detail = $location.search()['detail'] || 20;
    console.log("Rendering in " + $scope.renderer + " mode.");
    World.get($routeParams.worldId)
      .then(function(world) {
         $scope.data = world;
         $scope.status = World.status;
         $scope.id = $routeParams.worldId;
      });
  }

  $scope.$watch(function () { return World.status; }, function (newVal, oldVal) {
      if (typeof newVal !== 'undefined' && newVal != oldVal) {
        if(newVal == 'complete') $scope.data = World.data.world;
        $scope.status = World.status;
      }
    });

    $scope.$watch(function () { return $location.search()['detail']; }, function (newVal, oldVal) {
      if (typeof newVal !== 'undefined' && newVal != oldVal) {
        $scope.detail = $location.search()['detail'];
      }
    });

  }]);

tegmarkControllers.controller('IdCtrl', ['$scope', 'World', function($scope, World) {
  $scope.id = World.id;
  $scope.name = World.name;
  $scope.editMode = false;
  $scope.toggleEditMode = function() {
    $scope.editMode = !$scope.editMode;
  }
  $scope.renameWorld = function() {
    World.rename($scope.name);
    $scope.toggleEditMode();
  }

  $scope.$watch(function () { return World.id; }, function (newVal, oldVal) {
      if (typeof newVal !== 'undefined' && newVal != oldVal) {
        $scope.id = World.id;
        $scope.name = World.name;
      }
    });
  }]);

tegmarkControllers.controller('RecentCtrl', ['$scope', 'Worlds', 'World', function($scope, Worlds, World) {
  $scope.current = undefined;
  $scope.recent = [];
  $scope.names = Worlds.names();

  $scope.$watch(function () { return World.id; }, function (newVal, oldVal) {
      if (typeof newVal !== 'undefined' && newVal != oldVal) {
        var previous = $scope.current;
        var recent = $scope.recent;

        $scope.current = {id: World.id, name: World.name};

        if(typeof previous === 'undefined') return;
        $scope.recent = [];
        Worlds.list().then(function() {
          $scope.names = Worlds.names();
        });

        $scope.names[previous.id] = previous.name;
        var index = recent.indexOf($scope.current.id);
        if(index >= 0) {
          recent.splice(index, 1);
        }
        recent.unshift(previous.id);
        if(recent.length > 3) recent.pop();
        $scope.recent = recent;
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


tegmarkControllers.controller('WorldListCtrl', ['$scope', '$location', 'Worlds', 'World', function($scope, $location, Worlds, World) {
  var refresh = function() {
    Worlds.list().then(function(worlds) {
      $scope.worlds = worlds;
      console.log("World list updated.");
    });
  }
  $scope.createWorld = Worlds.create;
  $scope.createAndVisitWorld = function() {
    Worlds.create().then(function(id) {
      $location.path('/world/' + id);
    });
  }
  refresh();

  var knownName = function(name) {
    if(typeof $scope.worlds == 'undefined') return false;
    return $scope.worlds.reduce(function(seen, world) {
      return seen || (world.name == name);
    }, false);
  }

  $scope.$watch(function () { return World.name }, function (newVal, oldVal) {
    if (typeof newVal !== 'undefined' && !knownName(newVal)) {
      refresh();
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
