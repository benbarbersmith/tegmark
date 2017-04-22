var start = new Date();
var isDown = false;
var world = {};

window.onload = function() {
  if (typeof worldId === "undefined") worldId = "1";
  getWorld(worldId);
};

function getResource(
  url,
  resourceType,
  responseType,
  successCallback,
  errorCallback
) {
  var result = {};
  var req = new XMLHttpRequest();
  req.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      successCallback(this[responseType]);
    } else if (this.readyState == 4) {
      errorCallback(this);
    }
  };
  req.open("GET", url, true);
  req.responseType = resourceType;
  req.send();
}

function setStatusOverlay(text) {
  document.getElementById("coordsOverlay").innerHTML = text;
}

function getWorld(worldId) {
  setStatusOverlay("Requesting world " + worldId);

  var interval;
  function pollForWorld() {
    console.log("Polling for world " + worldId);
    getResource(
      "http://127.0.0.1:15000/api/world/" + worldId,
      "json",
      "response",
      function(json) {
        if (json.result !== "success") {
          clearInterval(interval);
          setStatusOverlay("Error: " + JSON.stringify(json, null, 2));
          console.error(json);
        } else {
          if (json.world.status == "complete") {
            world = json.world;
            clearInterval(interval);
            setStatusOverlay("Rendering " + world.name);
            getWorldFeatures();
          } else {
            setStatusOverlay(
              json.world.name + " is " + json.world.status + "..."
            );
          }
        }
      },
      console.error
    );
  }
  interval = setInterval(pollForWorld, 1000);
}

function getWorldFeatures() {
  getResource(
    "http://127.0.0.1:15000/api/world/" + world.id + "/structures",
    "arraybuffer",
    "response",
    buildWorld,
    console.error
  );
  getResource(
    "http://127.0.0.1:15000/api/world/" + world.id + "/features",
    "json",
    "response",
    mergePropertiesIntoWorld,
    console.error
  );
}

function addFeaturesToWorld(unsetFeatures) {
  var features = {};
  for (var i = 0; i < unsetFeatures.cells.length; i++) {
    world.cells[i].features = unsetFeatures.cells[i];
    var featureKeys = Object.keys(world.cells[i].features);
    for (var j = 0; j < featureKeys.length; j++) {
      var key = featureKeys[j];
      var featureMinMax = features[key];
      if (typeof featureMinMax === "undefined") {
        featureMinMax = { name: key, min: 0.0, max: 0.0 };
      }
      var value = world.cells[i].features[key];
      if (featureMinMax.min > value) featureMinMax.min = value;
      if (featureMinMax.max < value) featureMinMax.max = value;
      features[key] = featureMinMax;
    }
  }
  var featureKeys = Object.keys(features);
  for (var i = 0; i < featureKeys.length; i++) {
    var feature = features[featureKeys[i]];
    feature.colour = colourmaps.getMap("chloropleth", {
      buckets: 50,
      min: feature.min,
      max: feature.max
    });
    features[featureKeys[i]] = feature;
  }

  for (var i = 0; i < unsetFeatures.paths.length; i++) {
    world.paths[i].features = unsetFeatures.paths[i];
  }

  world.features = features;

  webgl.updatePolygons(getPolygons(world.cells, world.nodes, world.colours));
  updateColourSelector(features);
}

function mergePropertiesIntoWorld(json) {
  if (
    world.hasOwnProperty("cells") && world.cells[0].hasOwnProperty("features")
  ) {
    return;
  } else if (world.hasOwnProperty("cells")) {
    addFeaturesToWorld(json.features);
  } else {
    world.unsetFeatures = json.features;
  }
}

function buildWorld(response) {
  if (world.hasOwnProperty("cells")) {
    console.error("World already built!");
    return;
  }

  wheeler.decode(response, world);

  if (world.hasOwnProperty("unsetFeatures")) {
    addFeaturesToWorld(json.features);
    delete world.unsetFeatures;
  }
  renderWorld();
}

function renderWorld() {
  var canvas = resizeCanvas();
  var polygons = getPolygons(world.cells, world.nodes, world.colours);
  var paths = getPaths(world.paths, world.nodes, world.colours);
  webgl.initialize(canvas, polygons, paths);
  console.log("First render: " + (new Date() - start) + " ms");

  setStatusOverlay("World " + world.id + " is ready to explore!");

  window.addEventListener("wheel", changeZoom, false);
  window.addEventListener("resize", resizeCanvas, false);
  window.addEventListener("mousemove", pan, false);
  canvas.addEventListener("mousemove", updateHud(polygons, world.cells), false);
  window.addEventListener(
    "mousedown",
    function() {
      isDown = true;
    },
    false
  );
  window.addEventListener(
    "mouseup",
    function() {
      isDown = false;
    },
    false
  );
}

function resizeCanvas(e) {
  var width = window.innerWidth;
  var height = window.innerHeight;

  var canvas = document.getElementById("canvas");
  canvas.setAttribute("width", width);
  canvas.setAttribute("height", height);

  if (typeof e !== "undefined")
    webgl.updateViewport(null, null, null, null, null, width, height);
  return canvas;
}

function changeZoom(e) {
  webgl.updateViewport(e.x, e.y, -e.deltaY);
}

function pan(e) {
  if (isDown) webgl.updateViewport(null, null, null, e.movementX, -e.movementY);
}

function getPaths(paths, nodes, colours) {
  var good = 0;
  var toFix = [];
  var ps = new Array(paths.length);

  for (var i = 0; i < paths.length; i++) {
    var path = new Array(paths[i].length);
    for (var j = 0; j < paths[i].length; j++) {
      var point = nodes[paths[i][j]];
      path[j] = point;
    }

    var colour = new Float32Array(3);
    for (var j = 0; j <= 2; j++) {
      colour[j] = colours[paths[i].colour][j] / 255.0;
    }

    if (!isWorldWrapping(path)) {
      path.colour = colour;
      ps[i] = path;
      good = i;
    } else {
      // TODO: Fix world wrapping lines properly.
      toFix.push(i);
    }
  }
  for (var i = 0; i < toFix.length; i++) {
    ps[toFix[i]] = ps[good];
  }
  return ps;
}

function getPolygons(cells, nodes, colours) {
  var hasFeatures = cells[0].hasOwnProperty("features");
  var polygons = new Array(cells.length);

  for (var i = 0; i < cells.length; i++) {
    var polygon = new Array(cells[i].length);
    var boundingBox = new Float32Array(4);
    for (var j = 0; j < cells[i].length; j++) {
      var point = nodes[cells[i][j]];
      polygon[j] = point;
      if (boundingBox[0] > point[0]) boundingBox[0] = point[0];
      if (boundingBox[1] < point[0]) boundingBox[1] = point[0];
      if (boundingBox[2] > point[1]) boundingBox[2] = point[1];
      if (boundingBox[3] < point[1]) boundingBox[3] = point[1];
    }
    var colour = {};
    var defaultColour = new Float32Array(3);
    for (var j = 0; j <= 2; j++) {
      defaultColour[j] = colours[cells[i].colour][j] / 255.0;
    }
    colour["biomes"] = defaultColour;

    if (hasFeatures) {
      var keys = Object.keys(cells[i].features);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        colour[key] = world.features[key].colour(cells[i].features[key]);
      }
    }

    if (!isWorldWrapping(polygon)) {
      polygon.colour = colour;
      polygon.boundingBox = boundingBox;
      polygons[i] = polygon;
    } else {
      var newPolygons = splitConvexPolygon(polygon);
      newPolygons[0].colour = colour;
      newPolygons[0].boundingBox = boundingBox;
      polygons[i] = newPolygons[0];
      if (newPolygons.length > 1) {
        newPolygons[1].index = i;
        newPolygons[1].colour = colour;
        newPolygons[1].boundingBox = boundingBox;
        polygons.push(newPolygons[1]);
      }
    }
  }
  return polygons;
}

function crossProduct(p0, p1, p2) {
  var dx1 = p1[0] - p0[0]; // x[k+1]-x[k]
  var dy1 = p1[1] - p0[1]; // y[k+1]-y[k]
  var dx2 = p2[0] - p1[0]; // x[k+2]-x[k+1]
  var dy2 = p2[1] - p1[1]; // y[k+2]-y[k+1]
  return dx1 * dy2 - dy1 * dx2;
}

function isWorldWrapping(p) {
  var i = 0, j = 0;
  for (i = 0; i < p.length; i++) {
    j = i + 1;
    if (j == p.length) j = 0;
    if (Math.abs(p[j][0] - p[i][0]) > 90) return true;
  }
  return false;
}

function isConvex(polygon) {
  for (i = 2; i < polygon.length + 2; i++) {
    var p0, p1, p2;
    i >= polygon.length ? (p2 = i - polygon.length) : (p2 = i);
    i - 1 >= polygon.length ? (p1 = i - polygon.length - 1) : (p1 = i - 1);
    i - 2 >= polygon.length ? (p1 = i - polygon.length - 2) : (p0 = i - 2);
    if (crossProduct(polygon[p0], polygon[p1], polygon[p2]) < 0) return false;
  }
  return true;
}

function intersectionOfLine(p0, p1) {
  var x, y;
  p0[0] < 0 ? (x = 180) : (x = -180);
  y = p1[1] - (p1[1] - p0[1]) / (p1[0] - p0[0]) * p1[0];
  return [[x, y], [-x, y]];
}

function splitConvexPolygon(polygon) {
  var crossCount = 0;
  var crossedBorder = false;
  var axis = 0;
  var polygon1 = [], polygon2 = [];
  var p0, p1, crossingPoints;

  for (i = 0; i < polygon.length; i++) {
    p0 = polygon[i];
    var j = i + 1;
    if (i == polygon.length - 1) j = 0;
    p1 = polygon[j];
    if (p0[axis] < 0) {
      polygon1.push(p0);
      if (p1[axis] >= 0) {
        crossingPoints = intersectionOfLine(p0, p1, axis);
        crossingPoints[0].push(p0[2]);
        crossingPoints[1].push(p0[2]);
        crossCount++;
        polygon1.push(crossingPoints[1]);
        polygon2.push(crossingPoints[0]);
      }
    } else {
      polygon2.push(p0);
      if (p1[axis] < 0) {
        crossingPoints = intersectionOfLine(p0, p1, axis);
        crossCount++;
        polygon1.push(crossingPoints[0]);
        polygon2.push(crossingPoints[1]);
      }
    }
  }

  if (crossCount > 0 && crossCount % 2 == 0) {
    if (polygon1.length > 0 && polygon2.length > 0) {
      return [polygon1, polygon2];
    } else if (polygon1.length == 0) {
      return [polygon2];
    } else if (polygon2.length == 0) {
      return [polygon1];
    }
  } else {
    return [polygon];
  }
}

function updateHud(polygons, cells) {
  return function(e) {
    var index = -1;
    var canvas = document.getElementById("canvas");
    var point = webgl.getLatLon(e.x, e.y);
    var lon = point[0];
    var lat = point[1];

    for (i = 0; i < polygons.length; i++) {
      if (pointInPolygon(lon, lat, polygons[i])) {
        if (polygons[i].hasOwnProperty("index")) {
          index = polygons[i].index;
        } else {
          index = i;
        }
        break;
      }
    }

    if (index == -1) return;

    var latlonElement = document.getElementById("coordsOverlay");
    latlonElement.innerHTML = "LatLon: (" +
      lat.toFixed(6) +
      ", " +
      lon.toFixed(6) +
      ")";
    var altElement = document.getElementById("altitudeOverlay");
    if (cells[i] && cells[i].hasOwnProperty("features")) {
      altElement.innerHTML = "Alt: " +
        cells[i].features.terrain_altitude.toFixed(2);
    }
    if (cells[i] && cells[i].hasOwnProperty("features")) {
      var featuresElement = document.getElementById("features");
      var c = "rgb(" +
        colours[cells[i].colour][0] +
        "," +
        colours[cells[i].colour][1] +
        "," +
        colours[cells[i].colour][2] +
        ")";
      featuresElement.innerHTML = JSON.stringify(cells[i].features, null, 2);
      latlonElement.style.color = c;
      altElement.style.color = c;
      featuresElement.style.color = c;
    }
  };
}

function keyToReadableValue(key) {
  key = key.replace("_", " ");
  key = key[0].toUpperCase() + key.slice(1);
  return key;
}

function updateColourSelector(features) {
  var keys = Object.keys(features);
  var colourmaps = document.getElementById("colourmapSelect");
  while (colourmaps.children.length > 1) {
    colourmaps.removeChild(colourmaps.lastChild);
  }
  colourmaps.onchange = function(e) {
    webgl.recolour(e.srcElement.value);
  };
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].slice(keys[i].length - 3) == "_id") continue;
    var element = document.createElement("option");
    element.setAttribute("value", keys[i]);
    element.innerHTML = keyToReadableValue(keys[i]);
    colourmaps.appendChild(element);
  }
}

function pointInPolygon(x, y, vertices) {
  var boundingBox = vertices.boundingBox;
  if (
    x < vertices.boundingBox[0] ||
    x > vertices.boundingBox[1] ||
    y < vertices.boundingBox[2] ||
    y > vertices.boundingBox[3]
  )
    return false;
  var inside = false;
  for (var i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    var xi = vertices[i][0], yi = vertices[i][1];
    var xj = vertices[j][0], yj = vertices[j][1];

    var intersect = yi > y != yj > y &&
      x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}
