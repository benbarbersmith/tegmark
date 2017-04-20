var colourmaps = (function() {
  function rgb(r, g, b) {
    return [r, g, b];
  }

  function colourMix(bounds, distance, direction, buckets) {
    var steps = [];
    var ranges = [];
    var num_steps = [0, 1, 2].map(function(i) {
      ranges[i] = bounds[1][i] - bounds[0][i]; //-7
      var step = ranges[i] / buckets; //-15.4
      steps[i] = step == Math.abs(step) ? Math.ceil(step) : Math.floor(step); //-16
      return Math.floor(ranges[i] * distance * direction / steps[i]);
    });
    return [0, 1, 2].map(function(i) {
      var base = direction > 0 ? bounds[0][i] : bounds[1][i];
      var colour = Math.round(base + Math.min(...num_steps) * steps[i]);
      //var colour = Math.round(bounds[0][i] + ranges[i]*distance*direction);
      return colour;
    });
  }

  function getColourByMaxima(params) {
    return function(d, buckets) {
      if (
        !params.hasOwnProperty("name") ||
        !params.hasOwnProperty("max") ||
        !params.hasOwnProperty("min")
      ) {
        console.error(
          "Colouring by maxima requires a parameter object with a name, min, max."
        );
        return "rgb(30,30,30)";
      }
      var colourBounds = [rgb(50, 50, 50), rgb(240, 240, 240)];
      var colour;
      if (
        d.properties.hasOwnProperty(params.name) &&
        typeof d.properties[params.name] !== "undefined"
      ) {
        var distance = (d.properties[params.name] - params.min) /
          (params.max - params.min);
        colour = colourMix(colourBounds, distance, 1, buckets);
      } else {
        colour = rgb(30, 30, 30);
      }
      return "rgba(" + colour[0] + "," + colour[1] + "," + colour[2] + ",1)";
    };
  }

  var maps = {
    latitude: {
      func: getColourByMaxima({ name: "latitude", min: -90, max: 90 }),
      expectsParams: false
    },
    longitude: {
      func: getColourByMaxima({ name: "longitude", min: -180, max: 180 }),
      expectsParams: false
    },
    altitude: {
      func: getColourByMaxima({ name: "altitude", min: -1, max: 1 }),
      expectsParams: false
    },
    chloropeth: {
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
    }
  };
})();
