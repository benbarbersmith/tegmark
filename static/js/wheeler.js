var wheeler = (function() {
  const bytesPerNode = 14; // 3 floats + 2 unsigned integers.

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
    var hasQualities = cells[0].hasOwnProperty("qualities");
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
      var featureColour = {};
      var qualityColour = {};
      var defaultColour = new Float32Array(3);
      for (var j = 0; j <= 2; j++) {
        defaultColour[j] = colours[cells[i].colour][j] / 255.0;
      }
      colour["biomes"] = defaultColour;

      if (hasFeatures) {
        var keys = Object.keys(cells[i].features);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          featureColour[key] = world.features[key].featureColour(cells[i].features[key]);
        }
      }

      if (hasQualities) {
        var keys = Object.keys(cells[i].qualities);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          qualityColour[key] = world.qualities[key][cells[i].qualities[key]].colour;
        }
      }

      if (!isWorldWrapping(polygon)) {
        polygon.colour = colour;
        polygon.featureColour = featureColour;
        polygon.qualityColour = qualityColour;
        polygon.boundingBox = boundingBox;
        polygons[i] = polygon;
      } else {
        var newPolygons = splitConvexPolygon(polygon);
        newPolygons[0].colour = colour;
        newPolygons[0].featureColour = featureColour;
        newPolygons[0].qualityColour = qualityColour;
        newPolygons[0].boundingBox = boundingBox;
        polygons[i] = newPolygons[0];
        if (newPolygons.length > 1) {
          newPolygons[1].index = i;
          newPolygons[1].colour = colour;
          newPolygons[1].featureColour = featureColour;
          newPolygons[1].qualityColour = qualityColour;
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

  return {
    decode: function(arrayBuffer, world, logger) {
      if (world.hasOwnProperty("cells")) {
        console.error("World already built!");
        return;
      }

      if (typeof logger === "undefined") logger = function() {};

      var start = new Date();
      var nodeSectionLength = 0, cellSectionLength = 0, colourSectionLength = 0;

      function getNode(i) {
        var integerParts = new Uint8Array(arrayBuffer, i, 2);
        var n = new Float32Array(arrayBuffer.slice(i + 2, i + 2 + 12));
        if (n[0] > 0) {
          n[0] = n[0] + integerParts[0];
        } else {
          n[0] = n[0] - integerParts[0];
        }
        if (n[1] > 0) {
          n[1] = n[1] + integerParts[1];
        } else {
          n[1] = n[1] - integerParts[1];
        }
        return n;
      }

      var node = getNode(0);
      var nodes = [node];
      var byteArray = new Uint8Array(arrayBuffer);

      for (var i = bytesPerNode; i < byteArray.length; i += bytesPerNode) {
        node = getNode(i);
        var lastNode = nodes[nodes.length - 1];
        if (
          node[0] == lastNode[0] &&
          node[1] == lastNode[1] &&
          node[2] == lastNode[2]
        ) {
          nodeSectionLength = i + bytesPerNode;
          break;
        } else {
          nodes.push(node);
        }
      }
      logger(
        "Read " + nodes.length + " nodes from " + nodeSectionLength + " bytes"
      );

      function getColour(i) {
        return new Uint8Array(arrayBuffer, i, 3);
      }

      var colour = getColour(nodeSectionLength);
      var lastColour;
      colours = [colour];

      for (var i = nodeSectionLength + 3; i < byteArray.length; i += 3) {
        colour = getColour(i);
        lastColour = colours[colours.length - 1];
        if (
          lastColour[0] == colour[0] &&
          lastColour[1] == colour[1] &&
          lastColour[2] == colour[2]
        ) {
          colourSectionLength = i + 3 - nodeSectionLength;
          break;
        } else {
          colours.push(colour);
        }
      }

      logger(
        "Read " +
          colours.length +
          " colours from " +
          colourSectionLength +
          " bytes"
      );

      var bytesPerNodeIndex = Math.ceil(Math.log2(nodes.length) / 8);
      var bytesPerColourIndex = Math.ceil(Math.log2(colours.length) / 8);

      logger(
        "Expecting node indices with " +
          bytesPerNodeIndex +
          " bytes per cell index"
      );
      logger(
        "Expecting colour indices with " +
          bytesPerColourIndex +
          " bytes per colour index"
      );

      var offset = 0, sectionLength = 0;
      var objectArray = new Uint8Array(
        arrayBuffer,
        nodeSectionLength + colourSectionLength
      );

      function getIndex(bytesPerIndex, i) {
        var index = 0;

        for (var j = 0; j < bytesPerIndex; j++) {
          index += objectArray[i + j] * Math.pow(256, j);
        }
        return index;
      }

      function getObjects(objectName) {
        if (typeof objectName === "undefined") objectName = "objects";
        var lastIndex = -1, lastObjectIndex = -1;
        var objects = [], object = [];
        
        if (objectArray.byteLength == 0) {
            return objects;
        }

        objectLoop: while (offset <= objectArray.byteLength) {
          lastIndex = getIndex(bytesPerNodeIndex, offset);
          object = [lastIndex];
          indexLoop: for (
            var i = offset + bytesPerNodeIndex;
            i <= objectArray.byteLength;
            i += bytesPerNodeIndex
          ) {
            index = getIndex(bytesPerNodeIndex, i);
            if (index == lastIndex) {
              if (object.length == 1) {
                var lastObject = objects[objects.length - 1];
                offset += bytesPerNodeIndex;
                if (index == lastObject[lastObject.length - 1]) {
                  break objectLoop;
                }
              } else {
                object["colour"] = getIndex(
                  bytesPerColourIndex,
                  i + bytesPerNodeIndex
                );
                objects.push(object);
                offset = i + bytesPerNodeIndex + bytesPerColourIndex;
                break indexLoop;
              }
            } else {
              object.push(index);
              lastIndex = object[object.length - 1];
            }
          }
          
          if ((offset + bytesPerNodeIndex) >= objectArray.byteLength) {
            break objectLoop;
          }
        }
        logger("Read " + objects.length + " " + objectName);
        return objects;
      }
      var cells = getObjects("cells");
      var paths = getObjects("paths");

      world.nodes = nodes;
      world.colours = colours;
      world.cells = cells;
      world.paths = getPaths(paths, nodes, colours);
      world.polygons = getPolygons(cells, nodes, colours);

      var end = new Date();
      logger("Parse time: " + (end - start) + " ms");
    },
    getPolygons: function(world) {
      world.polygons = getPolygons(world.cells, world.nodes, world.colours);
    }
  };
})();
