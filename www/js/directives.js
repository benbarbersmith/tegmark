'use strict';

var tegmarkDirectives = angular.module('tegmarkDirectives', ['tegmarkServices']);

tegmarkDirectives.directive('map', ['$interval', 'd3', 'World', 'Renderer', function($interval, d3, World, Renderer) {
  return {
    restrict: 'E',
    scope: {
      world: "=",
      status: "=",
      renderer: "="
    },
    link: function(scope, elements, attrs) {
      var renderer = new Renderer(scope.renderer, elements[0]);
      var poll;

      scope.$watch("world", function (newVal, oldVal) {
        if (typeof newVal !== 'undefined' && newVal != oldVal) {
          renderer.render(scope.world, scope.status)
        }
      });

      scope.$watch("status", function (newVal, oldVal) {
        if (typeof newVal !== 'undefined' && newVal == "generating") {
          poll = $interval(World.poll, 500);
          renderer.render()
        }
        else if (oldVal == "generating" && newVal =="complete") {
          if(typeof poll !== 'undefined') $interval.cancel(poll);
          renderer.render()
        } else {
          if(typeof poll !== 'undefined') $interval.cancel(poll);
        }
      });
    }
  }
}]);
