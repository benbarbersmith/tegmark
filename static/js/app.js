var start = new Date();
var world = {};
var isDown = false;
var feature = "biomes";
var mode = "";

const server = "http://" +
  window.location.hostname +
  ":" +
  window.location.port +
  "/api/world/";

/**
var socket = new WebSocket(
  "ws://" + window.location.hostname + ":" + window.location.port + "/api"
);
**/

window.onload = function() {
  if (typeof worldId === "undefined") worldId = "1";
  getWorld(worldId);
};

function toggleMode(newMode) {
  if (mode == "") {
    mode = newMode;
  } else {
    mode = "";
    webgl.recolourPolygons(feature);
  }
}

function sendAction(action, successCallback) {
  var result = {};
  var req = new XMLHttpRequest();
  req.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      successCallback(this.response);
    } else if (this.readyState == 4) {
      console.error(this);
    }
  };
  req.open("PUT", server + world.id, true);
  req.responseType = "json";
  req.setRequestHeader("Content-Type", "application/json");
  req.send(JSON.stringify(action));
}

function buildSettlement(lon, lat) {
  var action = {
    build_settlement: {
      lon: lon,
      lat: lat
    }
  };
  sendAction(action, function(json) {
    mergePointsOfInterestIntoWorld([json.point_of_interest]);
  });
}

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
      server + worldId,
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
    server + world.id + "/structures",
    "arraybuffer",
    "response",
    buildWorld,
    console.error
  );
  getResource(
    server + world.id + "/features",
    "json",
    "response",
    mergeFeaturesIntoWorld,
    console.error
  );
  getResource(
    server + world.id + "/qualities",
    "json",
    "response",
    mergeQualitiesIntoWorld,
    console.error
  );
  getResource(
    server + world.id + "/points_of_interest",
    "json",
    "response",
    function(json) {
      mergePointsOfInterestIntoWorld(json.points_of_interest);
    },
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
    feature.featureColour = colourmaps.getMap("chloropleth", {
      buckets: 50,
      min: feature.min,
      max: feature.max
    });
    features[featureKeys[i]] = feature;
    for (var j = 0; j < world.cells.length; j++) {
      if (!world.cells[j].features.hasOwnProperty(featureKeys[i])) {
        world.cells[j].features[featureKeys[i]] = feature.min;
      }
    }
  }

  for (var i = 0; i < unsetFeatures.paths.length; i++) {
    world.paths[i].features = unsetFeatures.paths[i];
  }

  world.features = features;
  wheeler.getPolygons(world);
  webgl.updatePolygons(world.polygons);
  updateColourSelector(world.features, world.qualities);
}

function addQualitiesToWorld(unsetQualities) {
  var qualities = {};
  // qualities[quality] = {qualityvalue: [cell_id, cell_id, cell_id]}
  for (var i = 0; i < unsetQualities.cells.length; i++) {
    world.cells[i].qualities = unsetQualities.cells[i];
    var qualityKeys = Object.keys(world.cells[i].qualities);
    for (var j = 0; j < qualityKeys.length; j++) {
      var key = qualityKeys[j];
      var qualityValues = qualities[key];
      if (typeof qualityValues === "undefined") {
        qualityValues = {};
      }
      var qualityValue = qualityValues[world.cells[i].qualities[key]];
      if (typeof qualityValue === "undefined") {
        qualityValue = {cells: [i]};
      } else {
        qualityValue.cells.push(i);
      }
      qualityValues[world.cells[i].qualities[key]] = qualityValue;
      qualities[key] = qualityValues;
    }
  }
  var qualityKeys = Object.keys(qualities);
  for (var i = 0; i < qualityKeys.length; i++) {
    var quality = qualities[qualityKeys[i]];
    var qualityValueKeys = Object.keys(quality);
    for (var j = 0; j < qualityValueKeys.length; j++) {
      quality[qualityValueKeys[j]].colour = colourmaps.discreteColours[j % colourmaps.discreteColours.length]

    }
    qualities[qualityKeys[i]] = quality;
  }

  for (var i = 0; i < unsetQualities.paths.length; i++) {
    world.paths[i].qualities = unsetQualities.paths[i];
  }

  world.qualities = qualities;
  wheeler.getPolygons(world);
  webgl.updatePolygons(world.polygons);
  updateColourSelector(world.features, world.qualities);
}

function associatePointOfInterest(poi) {
  index = getCellByCoords(poi.longitude, poi.latitude);
  if (world.cells[index].hasOwnProperty("pointsOfInterest")) {
    world.cells[index].pointsOfInterest.push(poi);
  } else {
    world.cells[index].pointsOfInterest = [poi];
  }
}

function mergePointsOfInterestIntoWorld(pois) {
  if (world.hasOwnProperty("polygons")) {
    if (world.hasOwnProperty("pointsOfInterest")) {
      world.pointsOfInterest = world.pointsOfInterest.concat(pois);
    } else {
      world.pointsOfInterest = pois;
    }

    for (var i = 0; i < pois.length; i++) {
      var poi = pois[i];
      associatePointOfInterest(poi);
    }
  } else {
    if (world.hasOwnProperty("unattachedPointsOfInterest")) {
      world.unattachedPointsOfInterest.concat(pois);
    } else {
      world.unattachedPointsOfInterest = pois;
    }
  }
  webgl.updatePointsOfInterest(world.pointsOfInterest);
}

function mergeFeaturesIntoWorld(json) {
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

function mergeQualitiesIntoWorld(json) {
  if (
    world.hasOwnProperty("cells") && world.cells[0].hasOwnProperty("qualities")
  ) {
    return;
  } else if (world.hasOwnProperty("cells")) {
    addQualitiesToWorld(json.qualities);
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
    addFeaturesToWorld(world.unsetFeatures);
    delete world.unsetFeatures;
  }
  if (world.hasOwnProperty("unattachedPointsOfInterest")) {
    mergePointsOfInterestIntoWorld(world.unattachedPointsOfInterest);
    delete world.unattachedPointsOfInterest;
  }
  renderWorld();
}

function renderWorld() {
  var canvas = resizeCanvas();
  webgl.initialize(canvas, world.polygons, world.paths, world.pointsOfInterest);
  console.log("First render: " + (new Date() - start) + " ms");

  setStatusOverlay("World " + world.id + " is ready to explore!");

  canvas.addEventListener("wheel", changeZoom, false);
  canvas.addEventListener("click", takeAction, false);
  window.addEventListener("resize", resizeCanvas, false);
  window.addEventListener("mousemove", pan, false);
  window.addEventListener("mousemove", updateHud, false);
  window.addEventListener(
    "mousedown",
    function() {
      if (mode == "") isDown = true;
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

function takeAction(e) {
  if (mode == "buildSettlement") {
    point = webgl.getLatLon(e.x, e.y);
    buildSettlement(point[0], point[1]);
    toggleMode();
  }
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

function getCellByCoords(longitude, latitude) {
  var index = -1;
  for (i = 0; i < world.polygons.length; i++) {
    if (pointInPolygon(longitude, latitude, world.polygons[i])) {
      if (world.polygons[i].hasOwnProperty("index")) {
        index = world.polygons[i].index;
      } else {
        index = i;
      }
      break;
    }
  }
  return index;
}

function updateHud(e) {
  var canvas = document.getElementById("canvas");
  var point = webgl.getLatLon(e.x, e.y);
  var lon = point[0];
  var lat = point[1];

  var latlonElement = document.getElementById("coordsOverlay");
  latlonElement.innerHTML = "LatLon: (" +
    lat.toFixed(6) +
    ", " +
    lon.toFixed(6) +
    ")";

  var index = getCellByCoords(lon, lat);
  if (index == -1) return;

  var cell = world.cells[index];

  if (mode !== "") {
    var colour = new Float32Array(4);
    colour[0] = 1.0;
    colour[3] = 1.0;
    webgl.recolourPolygon(index, colour);
  }

  var featuresElement = document.getElementById("features");
  if (cell) {
    // unescapedText = JSON.stringify(cell.features, null, 2);
    unescapedText = printSortedFeatures(cell.features)
    if (cell.hasOwnProperty("pointsOfInterest")) {
      unescapedText += "\nPoIs in cell: ";
      unescapedText += cell.pointsOfInterest[0].name;
      for (var i = 1; i < cell.pointsOfInterest.length; i++) {
        unescapedText += ", " + cell.pointsOfInterest[i].name;
      }
    }
    var text = document.createTextNode(unescapedText);
    featuresElement.innerHTML = "";
    featuresElement.appendChild(text);
  }
}

function printSortedFeatures(features) {
  var keys = [];
  var output = "";
  for (k in features) {
    if (features.hasOwnProperty(k)) {
      keys.push(k);
    }
  }
  keys.sort();
  for (var i = 0; i < keys.length; i++) {
    output += keys[i] + ": " + features[keys[i]] + "\n";
  }
  return output;
}

function updateColourSelector(features, qualities) {
  console.log(features);
  console.log(qualities);
  if ((typeof features === "undefined") || (typeof qualities === "undefined")) {
    return;
  }
  var featureKeys = Object.keys(features);
  var qualityKeys = Object.keys(qualities);
  var colourMaps = document.getElementById("colourmapSelect");
  while (colourMaps.children.length > 1) {
    colourMaps.removeChild(colourMaps.lastChild);
  }
  colourMaps.onchange = function(e) {
    var select = e.srcElement;
    var option = select.options[select.selectedIndex];
    var colourMapType = option.getAttribute("data-type");
    var colourMapName = option.getAttribute("value");
    webgl.recolourPolygons(colourMapType, colourMapName);
  };
  featureKeys.sort();
  qualityKeys.sort();
  for (var i = 0; i < featureKeys.length; i++) {
    if (featureKeys[i].slice(featureKeys[i].length - 3) == "_id") continue;
    var element = document.createElement("option");
    element.setAttribute("value", featureKeys[i]);
    element.setAttribute("data-type", "feature")
    element.innerHTML = keyToReadableValue(featureKeys[i]);
    colourMaps.appendChild(element);
  }
  for (var i = 0; i < qualityKeys.length; i++) {
    if (qualityKeys[i].slice(qualityKeys[i].length - 3) == "_id") continue;
    var element = document.createElement("option");
    element.setAttribute("value", qualityKeys[i]);
    element.setAttribute("data-type", "quality")
    element.innerHTML = keyToReadableValue(qualityKeys[i]);
    colourMaps.appendChild(element);
  }
}

function keyToReadableValue(key) {
  key = key.split("_").join(" : ");
  key = key[0] + key.slice(1);
  return key;
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
