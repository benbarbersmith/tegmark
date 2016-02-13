'use strict';

var tegmarkDirectives = angular.module('tegmarkDirectives', ['tegmarkServices']);

tegmarkDirectives.directive('map', ['d3', function(d3) {
  return {
    restrict: 'E',
    scope: {
      data: "="
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
  	    projection.translate(d3.event.translate).scale(d3.event.scale);
  	    svg.selectAll("path").attr("d", path);
  	  }

      var zoom = d3.behavior.zoom()
    		.translate(projection.translate())
    		.scale(projection.scale())
    		.on("zoom", zoomed);

      zoom(svg);

      var rotateWorld = function() {
        var p = d3.mouse(this);
        projection.rotate([λ(p[0]), φ(p[1])]);
        svg.selectAll("path").attr("d", path);
      }

      var moving = false;
      svg.on("click", function() {
        moving = !moving;
        if(moving) {
          console.log("Enable rotation.");
          svg.on("mousemove", rotateWorld)
        }
        else {
          console.log("Disable rotation.");
          svg.on("mousemove", function() {})
        }
      });

      var i = 0;
      var colors = ["firebrick", "yellowgreen", "dodgerblue", "gold"];
      var getId = function() {
        i++;
        return colors[i % colors.length];
      }

      var render = function() {
        if(typeof scope.data !== 'undefined') {
          console.log("Rendering map.");

          svg.selectAll(".subunit")
            .data(scope.data.features)
            .enter().append("path")
            .attr("class", "land")
            .attr("fill", function(d) { return getId(); })
            .attr("fill-opacity", "0.8")
            .attr("d", path)
            .style("stroke-width", "1")
            .style("stroke", "black");
        }
      };

      scope.$watch("data", function (newVal, oldVal) {
        if (typeof newVal !== 'undefined' && newVal != oldVal) {
          svg.selectAll("*").remove();
          render();
          }
        });
      }
    }
  }]);
