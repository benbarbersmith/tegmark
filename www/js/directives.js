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

      var colourMap = {
    		'sea' : '#3498db',
    		'lowlands' : '#27ae60',
    		'highlands' : '#c0392b',
    		'alpine' : '#95a5a6'
  	  }
      
      var getId = function(d) {
    		return colourMap[d.properties.terrain_type];
      }

      var render = function() {
        if(typeof scope.data !== 'undefined') {
          console.log("Rendering map.");

          svg.selectAll(".subunit")
            .data(scope.data.features)
            .enter().append("path")
            .attr("class", "land")
            .attr("fill", function(d) { return getId(d); })
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
