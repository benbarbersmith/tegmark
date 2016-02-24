'use strict';

var tegmarkDirectives = angular.module('tegmarkDirectives', ['tegmarkServices']);

tegmarkDirectives.directive('map', ['$interval', 'd3', 'World', 'ColourMaps', 'Renderer', function($interval, d3, World, ColourMaps, Renderer) {
  return {
    restrict: 'E',
    scope: {
      world: "=",
      status: "=",
      colourmap: "=",
      detail: "="
    },
    templateUrl: "partials/map.html",
    link: function(scope, elements, attrs) {
      var poll, cells;
      var renderer = new Renderer(elements[0], scope.detail, updateHud, resizeHud);

      var overlayContainer = angular.element("#overlay");

      var textOverlays = [
        {
          element: angular.element('#coordsOverlay'),
          update: function(coords, cell) {
            angular.element('#coordsOverlay').html("Lat: " + (coords[1]).toFixed(4) + "<br/>Lon: " + (coords[0]).toFixed(4));
          }
        },
        {
          element: angular.element('#terrainOverlay'),
          update: function(coords, cell) {
            angular.element('#terrainOverlay').html("Terrain:<br/>" + cell.properties.terrain_type[0].toUpperCase() + cell.properties.terrain_type.slice(1));
          }
        },
        {
          element: angular.element('#altitudeOverlay'),
          update: function(coords, cell) {
            angular.element('#altitudeOverlay').html("Altitude:<br/>" + (cell.properties.terrain_altitude * 10000).toFixed(0) +"m");
          }
        }
      ];

      var controlOverlays = [
        {
          element: angular.element('#colourmapOverlay'),
          update: function() {}
        }
      ];

      var overlays = textOverlays.concat(controlOverlays);

      overlays.map(function(o) { o.element.css('width', 100/(overlays.length) + '%') });

      function getPropertiesFromWorld(world) {
        var properties = Object.keys(world.topography.objects.land.geometries.reduce(function(props, obj) {
          Object.keys(obj.properties).forEach(function(key) { props[key] = "" });
          return props;
        }, {}));
        return properties
          .filter(function(p) {
            return p !== "cell_id" && p !== "colour";
          })
          .sort()
          .reduce(function(result, p) {
            var s = p.replace("_", " ");
            result[p] = s[0].toUpperCase() + s.slice(1);
            return result
          }, {});
      }

      function getCellsFromWorld(world) {
        return topojson.feature(world.topography, world.topography.objects.land).features;
      }

      function getCellFromCoords(coords) {
        // TODO: Use pnpoly and bounding boxes
        function dist(p1, p2) {
          return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
        }

        var nearest_dist = dist([cells[0].properties.longitude, cells[0].properties.latitude], coords);
        return cells.reduce(function(nearest, cell) {
          var distance = dist([cell.properties.longitude, cell.properties.latitude], coords);
          if(distance < nearest_dist) {
            nearest_dist = distance;
            return cell;
          } else {
            return nearest;
          }
        }, cells[0]);
      }

      function resizeHud() {
          overlayContainer.css("width", (elements[0].offsetParent.offsetWidth - 2 * elements[0].offsetLeft) + "px");
      }

      function updateHud(coords) {
        if(!isNaN(coords[0]) && !isNaN(coords[1]) && typeof cells !== 'undefined') {
          var cell = getCellFromCoords(coords);
          textOverlays.map(function(o) { o.update(coords, cell) });
        }
      }

      function colourWorld(bounds) {
        var result = {};
        var map;

        if(ColourMaps.hasSimpleMap(scope.colourmap)) {
          map = ColourMaps.getMap(scope.colourmap)
        } else {
          map = ColourMaps.getMap(scope.colourmap, {
            name: scope.colourmap,
            min: bounds[0],
            max: bounds[1]
          })
        }
        scope.world.topography.objects.land.geometries.forEach(function(d, i) {
          var colour = map(d, scope.detail);
          d.properties.colour = colour;
          result[colour] = [];
        });

        var features = Object.keys(result).reduce(function(acc, colour) {
          var res = topojson.merge(scope.world.topography, scope.world.topography.objects.land.geometries.filter(function(d) {
            return d.properties.colour == colour;
          }));
          res.colour = colour;
          acc.push(res)
          return acc;
        }, []);

        features.forEach(function(d, i) {
          result[d.colour].push(d);
        });

        return result;
      }

      function prepareAndRender() {
        console.log("Preparing world using detail level " + scope.detail + " and colour map " + scope.colourmap + ".");
        var prepareStart = Date.now();
        cells = getCellsFromWorld(scope.world);
        var bounds = cells.reduce(function(acc, c) {
          var cp = c.properties[scope.colourmap];
          if (cp < acc[0]) acc[0] = cp;
          if (cp > acc[1]) acc[1] = cp;
          return acc;
        }, [0, 0]);
        var world = colourWorld(bounds);
        scope.properties = getPropertiesFromWorld(scope.world);
        console.log("Ready to render in " + Object.keys(world).length + " colours.");
        console.log("Prepared world in " + (Date.now() - prepareStart) + "ms.");
        renderer.render(scope.status, world)
      }

      scope.$watch("status", function (newVal, oldVal) {
        if (typeof newVal !== 'undefined' && newVal == "generating") {
          poll = $interval(World.poll, 1000);
          renderer.render(scope.status)
        }
        else if (newVal == "complete") {
          if(typeof poll !== 'undefined') $interval.cancel(poll);
          prepareAndRender();
        } else {
          if(typeof poll !== 'undefined') $interval.cancel(poll);
        }
      });

      scope.$watch("colourmap", function (newVal, oldVal) {
        if (typeof newVal !== 'undefined' && oldVal !== newVal) {
          prepareAndRender();
        }
      });
    }
  }
}]);
