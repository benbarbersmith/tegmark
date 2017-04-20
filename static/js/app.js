var worldName = "large";
var start = new Date();
var isDown = false;

window.onload = function() {
  getWorld();
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
  if (typeof worldId === "undefined") worldId = "00000076";
  setStatusOverlay("Requesting world " + worldId);
  var world = {};
  var interval;

  function pollForWorld() {
    console.log("Polling for world");
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
          world = json.world;
          world.id = worldId;
          if (world.status == "complete") {
            clearInterval(interval);
            setStatusOverlay("Rendering world " + worldId);
            getWorldFeatures(world);
          } else {
            setStatusOverlay(
              "World " + worldId + " is " + world.status + "..."
            );
          }
        }
      },
      console.error
    );
  }
  interval = setInterval(pollForWorld, 500);
}

function getWorldFeatures(world) {
  getResource(
    "http://127.0.0.1:15000/api/world/" + world.id + "/features",
    "arraybuffer",
    "response",
    buildWorld(world),
    console.error
  );
  getResource(
    "http://127.0.0.1:15000/api/world/" + world.id + "/feature_properties",
    "json",
    "response",
    function(json) {
      if (world.hasOwnProperty("cells")) {
        for (var i = 0; i < json.feature_properties.cells.length; i++) {
          world.cells[i].properties = json.feature_properties.cells[i];
        }
        console.log("Startup time: " + (new Date() - start) + " ms");
      } else {
        world.feature_properties = json.feature_properties;
      }
    },
    console.error
  );
}

function getProperties(successCallback) {}

function buildWorld(world) {
  return function(response) {
    wheeler.decode(response, world);
    var canvas = resizeCanvas(function() {})();
    var polygons = getPolygons(world.cells, world.nodes, world.colours);
    var canvasFunctions = startRendering(canvas, polygons);
    console.log("First render: " + (new Date() - start) + " ms");
    if (world.hasOwnProperty("feature_properties")) {
      for (var i = 0; i < world.cells.length; i++) {
        world.cells[i].properties = world.feature_properties.cells[i];
      }
      delete world.feature_properties;
    }

    var updateCanvas = canvasFunctions.updateViewport;
    var getLatLon = canvasFunctions.getLatLon;

    setStatusOverlay("World " + world.id + " is ready to explore!");

    window.addEventListener("wheel", changeZoom(updateCanvas), false);
    window.addEventListener("resize", resizeCanvas(updateCanvas), false);
    window.addEventListener("mousemove", pan(updateCanvas), false);
    canvas.addEventListener(
      "mousemove",
      updateHud(polygons, world.cells, getLatLon),
      false
    );
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
  };
}

function resizeCanvas(updateCanvas) {
  return function() {
    var width = window.innerWidth;
    var height = window.innerHeight;

    var canvas = document.getElementById("canvas");
    canvas.setAttribute("width", width);
    canvas.setAttribute("height", height);

    updateCanvas(null, null, null, null, null, width, height);
    return canvas;
  };
}

function changeZoom(updateCanvas) {
  return function(e) {
    updateCanvas(e.x, e.y, -e.deltaY);
  };
}

function pan(updateCanvas) {
  return function(e) {
    if (isDown) updateCanvas(null, null, null, e.movementX, -e.movementY);
  };
}

function getPolygons(cells, nodes, colours) {
  var success = 0, failure = 0;
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
    var colour = new Float32Array(3);
    for (var j = 0; j <= 2; j++) {
      colour[j] = colours[cells[i].colour][j] / 255.0;
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
  console.log("Total polygons: " + polygons.length);
  return polygons;
}

function crossProduct(p0, p1, p2) {
  var dx1 = p1[0] - p0[0]; // x[k+1]-x[k]
  var dy1 = p1[1] - p0[1]; // y[k+1]-y[k]
  var dx2 = p2[0] - p1[0]; // x[k+2]-x[k+1]
  var dy2 = p2[1] - p1[1]; // y[k+2]-y[k+1]
  return dx1 * dy2 - dy1 * dx2;
}

function isWorldWrapping(polygon) {
  var i = 0, j = 0;
  for (i = 0; i < polygon.length; i++) {
    j = i + 1;
    if (j == polygon.length) j = 0;
    if (Math.abs(polygon[j][0] - polygon[i][0]) > 90) return true;
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
  polygon1.push(polygon1[0]);
  polygon2.push(polygon2[0]);

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

function updateHud(polygons, cells, getLatLon) {
  return function(e) {
    var index = -1;
    var canvas = document.getElementById("canvas");
    var point = getLatLon(e.x, e.y);
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
    if (cells[i] && cells[i].hasOwnProperty("properties")) {
      altElement.innerHTML = "Alt: " +
        cells[i].properties.terrain_altitude.toFixed(2);
    }
    if (cells[i] && cells[i].hasOwnProperty("properties")) {
      cells[i].properties["lat"] = lat;
      cells[i].properties["lon"] = lon;
      var propsElement = document.getElementById("properties");
      var c = "rgb(" +
        colours[cells[i].colour][0] +
        "," +
        colours[cells[i].colour][1] +
        "," +
        colours[cells[i].colour][2] +
        ")";
      propsElement.innerHTML = JSON.stringify(cells[i].properties, null, 2);
      latlonElement.style.color = c;
      altElement.style.color = c;
      propsElement.style.color = c;
    }
  };
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
