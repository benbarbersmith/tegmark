'use strict';

var tegmarkDirectives = angular.module('tegmarkDirectives', ['tegmarkServices']);

tegmarkDirectives.directive('map', ['$interval', 'd3', 'World', 'Renderer', function($interval, d3, World, Renderer) {
  return {
    restrict: 'E',
    scope: {
      world: "=",
      status: "=",
      renderer: "=",
      detail: "="
    },
    link: function(scope, elements, attrs) {
      var renderer = new Renderer(scope.renderer, elements[0], scope.detail);
      var poll;

      scope.$watch("status", function (newVal, oldVal) {
        if (typeof newVal !== 'undefined' && newVal == "generating") {
          poll = $interval(World.poll, 500);
        }
        else if (newVal == "complete") {
          if(typeof poll !== 'undefined') $interval.cancel(poll);
          renderer.render(scope.world, scope.status)
        } else {
          if(typeof poll !== 'undefined') $interval.cancel(poll);
        }
      });
    }
  }
}]);
