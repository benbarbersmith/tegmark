var colourmaps = (function() {
  function rgb(r, g, b) {
    return [r, g, b];
  }

  function colourMix(bounds, distance, direction, buckets) {}

  function getColourByMaxima(params) {
    if (
      typeof params !== "object" ||
      !params.hasOwnProperty("buckets") ||
      !params.hasOwnProperty("max") ||
      !params.hasOwnProperty("min")
    ) {
      console.error(
        "Colouring by maxima requires a parameter object with a buckets, min, max value."
      );
      return rgb(0, 0, 0);
    } else {
      var bounds = [rgb(0, 0, 0), rgb(255, 255, 255)];
      var steps = [];
      var ranges = [];

      return function(value) {
        if (value < params.min)
          return "rgba(" +
            bounds[0][0] +
            "," +
            bounds[0][1] +
            "," +
            bounds[0][2] +
            ",1)";
        if (value > params.max)
          return "rgba(" +
            bounds[1][0] +
            "," +
            bounds[1][1] +
            "," +
            bounds[1][2] +
            ",1)";
        var distance = (value - params.min) / (params.max - params.min);
        var num_steps = [0, 1, 2].map(function(i) {
          ranges[i] = bounds[1][i] - bounds[0][i];
          var step = ranges[i] / params.buckets;
          steps[i] = step == Math.abs(step)
            ? Math.ceil(step)
            : Math.floor(step);
          return Math.floor(ranges[i] * distance / steps[i]);
        });
        var colour = [0, 1, 2].map(function(i) {
          return Math.round(bounds[0][i] + Math.min(...num_steps) * steps[i]);
        });
        return colour.map(function(c) {
          return c / 255.0;
        });
      };
    }
  }

  var maps = {
    latitude: {
      func: getColourByMaxima({ buckets: 50, min: -90, max: 90 }),
      expectsParams: false
    },
    longitude: {
      func: getColourByMaxima({ buckets: 50, min: -180, max: 180 }),
      expectsParams: false
    },
    altitude: {
      func: getColourByMaxima({ buckets: 50, min: -10000, max: 10000 }),
      expectsParams: false
    },
    chloropleth: {
      func: getColourByMaxima,
      expectsParams: true
    }
  };

  return {
    getMap: function(name, input) {
      var map;
      if (maps.hasOwnProperty(name)) {
        map = maps[name];
      } else {
        console.log(
          "Map " + name + " not found. Using basic chloropeth instead."
        );
        map = maps["chloropeth"];
      }
      if (map.expectsParams) {
        if (typeof input !== "undefined") {
          return map.func(input);
        } else {
          console.error(
            "Map " + name + " expects parameters. None were passed."
          );
        }
      } else {
        return map.func;
      }
    },
    hasSimpleMap: function(name) {
      return maps.hasOwnProperty(name) && !maps[name].expectsParams;
    },
    discreteColours: [rgb(231, 76, 60), rgb(241, 196, 15), rgb(155, 89, 182), rgb(46, 204, 113), rgb(149, 165, 166),
      rgb(230, 126, 34), rgb(52, 73, 94), rgb(52, 152, 219), rgb(26, 188, 156), rgb(236, 240, 241), rgb(192, 57, 43),
      rgb(243, 156, 18), rgb(142, 68, 173), rgb(39, 174, 96), rgb(127, 140, 141), rgb(211, 84, 0), rgb(44, 62, 80),
      rgb(41, 128, 185), rgb(22, 160, 133), rgb(189, 195, 199)]
  };
})();
