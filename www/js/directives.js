'use strict';

var tegmarkDirectives = angular.module('tegmarkDirectives', ['tegmarkServices']);

tegmarkDirectives.directive('svgmap', ['$interval', '$window', 'd3', 'World', function($interval, $window, d3, World) {
  return {
    restrict: 'E',
    scope: {
      world: "=",
      status: "="
    },
    link: function(scope, elements, attrs) {

      var svg = d3.select(elements[0])
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("style", "border: rgb(231, 231, 231) 1px solid;");

      var bg = svg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "#fff");

      var λ = d3.scale.linear()
        .domain([0, width])
        .range([-180, 180]);

      var φ = d3.scale.linear()
        .domain([0, height])
        .range([90, -90]);

      var width = elements[0].offsetWidth;
      var height = elements[0].offsetParent.offsetHeight;
      var scale = 0.9 * 360;
      var offset = [width/2, (height-90)/2];
      var projection = d3.geo.orthographic()
        .scale(scale)
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

      var colourMix = function(bounds, distance, direction) {
        return [0,1,2].map(function(i) {
          var range = bounds[1][i] - bounds[0][i];
          var direction = (bounds[0][i] < bounds[1][i]) ? 1 : -1;
          return Math.round(bounds[0][i] + range*distance*direction);
        });
      }

      var colourMap = {
    		'permafrost' : [rgb(250,250,250), rgb(255,255,255)],
    		'sea' : [rgb(57,139,207), rgb(0,62,130)],
    		'lowlands' : [rgb(100,189,41), rgb(81,161,35)],
    		'highlands' : [rgb(81,161,35), rgb(25,76,17)],
    		'vegetation' : [rgb(100,189,41), rgb(25,76,17)],
    		'alpine' : [rgb(150,109,33), rgb(255,255,255)]
  	  }

      var altitudeMapByLatitude = function(latitude) {
        var highland_max = (-0.8*latitude*latitude + 3800) / 10000;
        highland_max = highland_max < 0 ? 0.000001 : highland_max;
        return {
      		'sea' : [-1, 0],
			    'permafrost' : [-1, 0],
      		'vegetation' : [0, highland_max],
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
        var terrain = d.properties.terrain_type;
    		var altitudeBounds = altitudeMapByLatitude(latitude)[terrain];
        var colourBounds = colourMap[terrain];
        var distance = (d.properties.altitude - altitudeBounds[0]) / (altitudeBounds[1] - altitudeBounds[0]);
        var rgb = colourMix(colourBounds, distance);
        return rgb;
      }

      var render = function() {
        console.log("Rendering map.");
        svg.append("svg:g")
          .append("path")
          .datum({type: "Sphere"})
          .attr("id", "sphere")
          .attr("d", path);

        svg.append("use")
          .attr("class", "stroke")
          .attr("xlink:href", "#sphere");

        svg.append("use")
          .attr("class", "fill")
          .attr("xlink:href", "#sphere")

        console.log(scope.world.topography);
        svg.selectAll(".subunit")
          .data(topojson.feature(scope.world.topography, scope.world.topography.objects.land).features)
          .enter().append("path")
          .attr("class", "cell")
          .attr("fill", function(d) {
            var rgb = getColorByAltitude(d);
            return "rgb("+rgb[0]+","+rgb[1]+","+rgb[2]+")";
          })
          .attr("fill-opacity", "0.7")
          .attr("d", path)
          .style("stroke-width", "1")
          .style("stroke", rgb)
          .on('mouseenter', function(d, i) {
            d3.selectAll('path.cell')
              .attr("fill-opacity", function (d, j) {
                  return j == i ? "1" : "0.7";
              });
            })
          .on('click', function(d, i) {
            var newAltitude = d.properties.altitude * 1.2;
            if(newAltitude > 1) new_altitude = 1;
            World.transform([
              d.properties.cell_id[0],
              d.properties.cell_id[1],
              newAltitude
            ]);
          });

      };

      var poll;

      angular.element($window).bind('resize', function(){
        var width = elements[0].offsetWidth;
        var height = elements[0].offsetParent.offsetHeight;
        var scale = 0.9 * 360;
        projection = d3.geo.orthographic()
          .scale(scale)
          .clipAngle(90)
          .translate([(width)/2, (height-90)/2]);
        path = d3.geo.path().projection(projection);
        console.log("updating translation");
        svg.selectAll("path").attr("d", path);
      });

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
              poll = $interval(World.poll, 1000);
            } else {
              if(typeof poll !== 'undefined') $interval.cancel(poll);
            }
          }
        }
        });
      }
    }
  }]);

tegmarkDirectives.directive('map', ['$interval', '$window', 'd3', 'World', function($interval, $window, d3, World) {
  return {
    restrict: 'E',
    scope: {
      world: "=",
      status: "="
    },
    link: function(scope, elements, attrs) {

      var canvas = d3.select(elements[0])
        .append("canvas")
        .attr("width", "1px")
        .attr("height", "1px")

      var width = 1,
          height = 1,
          scale = 0.9 * 360,
          projection = d3.geo.orthographic()
            .scale(scale)
            .clipAngle(90)
            .translate([(width)/2, (height-90)/2]);

      var path, poll, translate, visibleArea, invisibleArea;
      var context = canvas.node().getContext("2d");
      path = d3.geo.path().projection(projection);

      var resize = function() {
        if(elements[0].offsetParent == null) return null;
        width = elements[0].offsetParent.offsetWidth - 2 * elements[0].offsetLeft;
        height = elements[0].offsetParent.offsetHeight - 1.5 * elements[0].offsetTop;
        canvas[0][0].width = width;
        canvas[0][0].height = height;
        canvas[0][0].style = "border: rgb(231, 231, 231) 1px solid;";
        scale = 0.9 * 360;
        projection = d3.geo.orthographic()
          .scale(scale)
          .clipAngle(90)
          .translate([(width)/2, (height-90)/2]);
        path = d3.geo.path().projection(projection);
      }

      var renderMap = function() {
        context.clearRect(0, 0, width, height);
        console.log("Rendering map.");

        var globe = {type: "Sphere"};

        context.strokeStyle = '#777';
        context.fillStyle = '#fff';
        context.beginPath();
        path.context(context)(globe);
        context.fill();
        context.stroke();

        var cells = topojson.feature(scope.world.topography, scope.world.topography.objects.land).features;

        cells.forEach(function(d, i) {
          context.fillStyle = getColorByAltitude(d, 0.7);
          context.beginPath();
          path.context(context)(d);
          context.fill();
          context.stroke();
        });

        console.log("Finished rendering map.");
      }

      var renderText = function() {
        context.fillStyle = "#777";
        context.font = "18px Helvetica Neue,Helvetica,Arial,sans-serif";
        context.textAlign = "center";
        context.textBaseline = "hanging";
        context.fillText("Generating world...", Math.round(width/2), Math.round(height/2));

        if(scope.status == "generating") {
          poll = $interval(World.poll, 500);
        } else {
          if(typeof poll !== 'undefined') $interval.cancel(poll);
        }
      }

      var render = function() {
        resize();
        if(typeof scope.world !== 'undefined' && scope.status == "complete") {
          if(typeof poll !== 'undefined') $interval.cancel(poll);
          renderMap();
        }
        else {
          renderText();
        }
      }

      var rgb = function(r, g, b) {
        return [r,g,b];
      }

      var colourMix = function(bounds, distance, direction) {
        return [0,1,2].map(function(i) {
          var range = bounds[1][i] - bounds[0][i];
          var direction = (bounds[0][i] < bounds[1][i]) ? 1 : -1;
          return Math.round(bounds[0][i] + range*distance*direction);
        });
      }

      var colourMap = {
    		'permafrost' : [rgb(250,250,250), rgb(255,255,255)],
    		'sea' : [rgb(57,139,207), rgb(0,62,130)],
    		'lowlands' : [rgb(100,189,41), rgb(81,161,35)],
    		'highlands' : [rgb(81,161,35), rgb(25,76,17)],
    		'vegetation' : [rgb(100,189,41), rgb(25,76,17)],
    		'alpine' : [rgb(150,109,33), rgb(255,255,255)]
  	  }

      var altitudeMapByLatitude = function(latitude) {
        var highland_max = (-0.8*latitude*latitude + 3800) / 10000;
        highland_max = highland_max < 0 ? 0.000001 : highland_max;
        return {
      		'sea' : [-1, 0],
			    'permafrost' : [-1, 0],
      		'vegetation' : [0, highland_max],
          'lowlands' : [0, 0.05],
          'highlands' : [0.05, highland_max],
      		'alpine' : [highland_max, 1]
        };
  	  }

      var getColorByAltitude = function(d, a) {
        var latitude = d.geometry.coordinates[0].reduce(function(acc, i) {
          acc += i[1];
          return acc;
        }, 0) / d.geometry.coordinates[0].length;
        var terrain = d.properties.terrain_type;
    		var altitudeBounds = altitudeMapByLatitude(latitude)[terrain];
        var colourBounds = colourMap[terrain];
        var distance = (d.properties.altitude - altitudeBounds[0]) / (altitudeBounds[1] - altitudeBounds[0]);
        var rgb = colourMix(colourBounds, distance);
        return "rgba("+rgb[0]+","+rgb[1]+","+rgb[2]+","+a+")";
      }
    
      scope.$watch("world", function (newVal, oldVal) {
        if (typeof newVal !== 'undefined' && newVal != oldVal) {
          render()
        }
      });

      angular.element($window).bind('resize', function(){
        render();
      });
    }
  }
}]);
