'use strict';

var tegmarkDirectives = angular.module('tegmarkDirectives', ['tegmarkServices']);

tegmarkDirectives.directive('map', ['$interval', 'd3', 'World', function($interval, d3, World) {
  return {
    restrict: 'E',
    scope: {
      world: "=",
      status: "="
    },
    link: function(scope, elements, attrs) {
      var parent = elements[0].offsetParent;
      var width = parent.offsetWidth;
      var height = parent.offsetHeight;

      var svg = d3.select(elements[0])
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("style", "border: rgb(231, 231, 231) 1px solid;");

      var features = svg.append("g");

      var λ = d3.scale.linear()
        .domain([0, width])
        .range([-180, 180]);

      var φ = d3.scale.linear()
        .domain([0, height])
        .range([90, -90]);

      var offset = [(width-90)/2, (height-90)/2];
      var projection = d3.geo.orthographic()
        .scale(250)
        .clipAngle(90)
        .translate(offset);

      var path = d3.geo.path().projection(projection);

  	  var zoomed = function() {
  	    projection.scale(d3.event.scale);
  	    svg.selectAll("path").attr("d", path);
  	  }

      var zoom = d3.behavior.zoom()
    		.scale(projection.scale())
    		.on("zoom", zoomed);

      var getEvent = function(event){
        if(typeof event.sourceEvent !== 'undefined') {
          return d3.event.sourceEvent;
        } else if(typeof event.changedTouches !== 'undefined') {
          return d3.event.changedTouches[0];
        } else  {
          return d3.event;
        }
      }

      var m0, o0;
      var dstart = function() {
        var proj = projection.rotate();
        var event = getEvent(d3.event);
        m0 = [event.pageX, event.pageY];
        o0 = [-proj[0],-proj[1]];
      }
      var dmove = function() {
        if (m0) {
          var event = getEvent(d3.event);
          var m1 = [event.pageX, event.pageY];
          var o1 = [o0[0] + (m0[0] - m1[0]) / 4, o0[1] + (m1[1] - m0[1]) / 4];
          projection.rotate([-o1[0], -o1[1]]);
        }

        path = d3.geo.path().projection(projection);
        d3.selectAll("path").attr("d", path);
      }

      svg.call(zoom);

      svg.on("mousedown.zoom", dstart)
        .on("mousemove.zoom", dmove)
        .on("mouseup.zoom", function() { m0 = false; })
        .on("touchstart.zoom", dstart)
        .on("touchmove.zoom", dmove)
        .on("touchend.zoom", null);

      var rgb = function(r, g, b) {
        return [r,g,b];
      }

      var colourMix = function(bounds, distance) {
        return [0,1,2].map(function(i) {
          var max, min;
          if(bounds[1][i] > bounds[0][i]) {
            max = bounds[1][i];
            min = bounds[0][i];
          } else {
            max = bounds[0][i];
            min = bounds[1][i];
          }
          var range = max - min;
          return Math.round(min + range * distance);
        });
      }

      var colourMap = {
    		'sea' : [rgb(85,177,245), rgb(0,62,130)],
    		'lowlands' : [rgb(100,189,41), rgb(84,170,37)],
    		'highlands' : [rgb(84,170,37), rgb(25,76,17)],
    		'alpine' : [rgb(150,109,33), rgb(255,255,255)]
  	  }

      var altitudeMapByLatitude = function(latitude) {
        var highland_max = (-0.8*latitude*latitude + 3800) / 10000;
        return {
      		'sea' : [-1, 0],
      		'lowlands' : [0, 0.05],
      		'highlands' : [0.05, highland_max],
      		'alpine' : [highland_max, 1]
        };
  	  }

      var getColorByAltitude = function(d) {
        var latitude = d.geometry.coordinates[0].reduce(function(acc, i) {
          acc += i[1];
          return acc;
        }, 0) / d.geometry.coordinates[0].length;
    		var altitudeBounds = altitudeMapByLatitude(latitude)[d.properties.terrain_type];
        var colourBounds = colourMap[d.properties.terrain_type];
        var distance = (d.properties.altitude - altitudeBounds[0]) / (altitudeBounds[1] - altitudeBounds[0]);
        var rgb = colourMix(colourBounds, distance);
        return rgb;
      }

      var render = function() {
        console.log("Rendering map.");
        svg.selectAll(".subunit")
          .data(scope.world.geography.features)
          .enter().append("path")
          .attr("class", "land")
          .attr("fill", function(d) {
            var rgb = getColorByAltitude(d);
            return "rgb("+rgb[0]+","+rgb[1]+","+rgb[2]+")";
          })
          .attr("fill-opacity", "0.8")
          .attr("d", path)
          .style("stroke-width", "1")
          .style("stroke", "black");
      };

      var poll;

      scope.$watch("world", function (newVal, oldVal) {
        if (typeof newVal !== 'undefined' && newVal != oldVal) {
          svg.selectAll("*").remove();
          if(typeof scope.world !== 'undefined' && scope.status == "complete") {
            if(typeof poll !== 'undefined') $interval.cancel(poll);
            render();
          }
          else {
            svg.append("text")
              .text("Generating world...")
              .attr("x", "50%")
              .attr("y", "50%")
              .attr("alignment-baseline", "middle")
              .attr("text-anchor", "middle")
              .attr("font-family", "sans-serif")
              .attr("font-size", "18px")
              .attr("fill", "#777");
              ;
            if(scope.status == "generating") {
              poll = $interval(World.poll, 200);
            } else {
              if(typeof poll !== 'undefined') $interval.cancel(poll);
            }
          }
        }
        });
      }
    }
  }]);
