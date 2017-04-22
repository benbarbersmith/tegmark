var webgl = (function() {
  const fov = 90.0 / Math.tan(0.125 * Math.PI);
  const repetitions = [
    [0, 0],
    [360, 0],
    [-360, 0],
    [0, -180],
    [360, -180],
    [-360, -180],
    [0, 180],
    [360, 180],
    [-360, 180]
  ];

  var gl,
    buffers,
    shaders,
    polygons,
    paths,
    pointsOfInterest,
    vertexArray,
    colourArray,
    polygonVertices,
    polygonColours,
    pathVertices,
    pathColours,
    pointOfInterestVertices,
    pointOfInterestColours;
  var windowChanged = true;
  var dxBuffer = 0.0, dyBuffer = 0.0;
  var xpos = 0.0, ypos = 0.0, zpos = 1.0;
  var width = 0.0, height = 0.0;
  var boundingBox;
  var numPolygonVertices = 0,
    numPathVertices = 0,
    numPointOfInterestVertices = 0;

  var mvMatrix = mvTranslate([xpos, ypos, -fov / zpos], Matrix.I(4));
  var perspectiveMatrix = makePerspective(45, width / height, 0.001, 1000.0);

  var initialized = false;

  function initWebGL(canvas) {
    var gl = canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    if (!gl)
      console.error(
        "Unable to initialize WebGL. Your browser may not support it."
      );

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    perspectiveMatrix = makePerspective(45, width / height, 0.001, 1000.0);

    return gl;
  }

  function initShaders() {
    var fragmentShader = loadShader("shader-fs");
    var vertexShader = loadShader("shader-vs");

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error(
        "Unable to initialize the shader program: " +
          gl.getProgramInfoLog(shaderProgram)
      );
    }

    gl.useProgram(shaderProgram);

    var vertexPositionAttribute = gl.getAttribLocation(
      shaderProgram,
      "aVertexPosition"
    );
    gl.enableVertexAttribArray(vertexPositionAttribute);

    var vertexColourAttribute = gl.getAttribLocation(
      shaderProgram,
      "aVertexColour"
    );
    gl.enableVertexAttribArray(vertexColourAttribute);

    return {
      vertexPositionAttribute: vertexPositionAttribute,
      vertexColourAttribute: vertexColourAttribute,
      shaderProgram: shaderProgram
    };
  }

  function loadShader(id) {
    var shaderElement = document.getElementById(id);
    var src = shaderElement.text;
    var type;

    if (shaderElement.type == "x-shader/x-fragment") {
      type = gl.FRAGMENT_SHADER;
    } else if (shaderElement.type == "x-shader/x-vertex") {
      type = gl.VERTEX_SHADER;
    } else {
      console.error("Unknown shader type.");
      return null;
    }
    if (!src) {
      console.error("Shader source not present:", shaderElement);
      return null;
    }
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(
        "An error occurred compiling the shaders: " +
          gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function initBuffers() {
    polygonVertices = getVerticesForPolygons(polygons, numPolygonVertices);
    polygonColours = getColoursForPolygons(polygons, numPolygonVertices);
    pathVertices = getVerticesForPaths(paths, numPathVertices);
    pathColours = getColoursForPaths(paths, numPathVertices);
    pointOfInterestVertices = getVerticesForPointsOfInterest(pointsOfInterest);
    pointOfInterestColours = getColoursForPointsOfInterest(pointsOfInterest);

    vertexArray = new Float32Array(
      (numPolygonVertices + numPathVertices + numPointOfInterestVertices) * 3
    );

    colourArray = new Float32Array(
      (numPolygonVertices + numPathVertices + numPointOfInterestVertices) * 4
    );

    var verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

    var colourBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colourArray, gl.STATIC_DRAW);

    return {
      verticesBuffer: verticesBuffer,
      colourBuffer: colourBuffer
    };
  }

  function getColoursForPaths(paths, numVertices) {
    var x = 0;
    var colours = new Float32Array(numVertices * 4);
    var colour = paths[0].colour;
    for (var i = 0; i < numVertices; i++) {
      colours.set(colour, i * 4);
    }
    return colours;
  }

  function getColoursForPointsOfInterest(pointsOfInterest) {
    var numVertices = pointsOfInterest.length * 10;
    var colours = new Float32Array(numVertices * 4);
    var colour = [
      0.9137254901960784,
      0.11764705882352941,
      0.38823529411764707,
      1.0
    ];
    for (var i = 0; i < numVertices; i++) {
      colours.set(colour, i * 4);
    }
    return colours;
  }

  function getColoursForPolygons(polygons, numVertices, feature) {
    if (typeof feature !== "string") {
      feature = "biomes";
    }

    var x = 0;
    var colours = new Float32Array(numVertices * 4);

    function addVertex(colour) {
      colours[x] = colour[0];
      colours[x + 1] = colour[1];
      colours[x + 2] = colour[2];
      colours[x + 3] = 1.0; // Full opacity;
      x += 4;
    }
    for (i = 0; i < polygons.length; i++) {
      var polygon = polygons[i];
      var colour = polygon.colour[feature];
      addVertex(colour);
      for (j = 1; j < polygon.length - 1; j += 2) {
        addVertex(colour);
        addVertex(colour);
        addVertex(colour);
      }
      if (polygon.length % 2 == 0) addVertex(colour);
      addVertex(colour);
      addVertex(colour);
    }
    return colours;
  }

  function countVerticesForPaths(paths) {
    var numVertices = 0;
    for (var i = 0; i < paths.length; i++) {
      // For triangle strip, need 4 points for every line segment, plus two more points for the denegerate triangle.
      numVertices += paths[i].length * 6;
    }
    return numVertices;
  }

  function countVerticesForPolygons(polygons, maxIndex) {
    if (typeof maxIndex === "undefined") maxIndex = polygons.length;
    var n = 0;
    var vs = 0;
    for (var i = 0; i < maxIndex; i++) {
      var ps = polygons[i].length;
      n += ps;
      // For triangle strip, need to add one extra point for every two points in a polygon, plus two more points for the denegerate triangle.
      vs += 3 +
        (polygons[i].length % 2 + 1) % 2 +
        Math.floor((polygons[i].length - 1) / 2) * 3;
    }
    return vs;
  }

  function getVerticesForPaths(paths, numVertices) {
    var x = 0;
    var p0mod, p1mod;
    var vertices = new Float32Array(numVertices * 3);

    function addSegment(p0, p1) {
      //TODO: Respect the river width.
      var dx = p1[0] - p0[0];
      var dy = p1[1] - p0[1];
      var normal = [-dy, dx];

      p0mod = [p0[0] + 0.2 * normal[0], p0[1] + 0.2 * normal[1], p0[2]];
      p1mod = [p1[0] + 0.2 * normal[0], p1[1] + 0.2 * normal[1], p1[2]];

      addVertex(p0);
      addVertex(p0mod);
      addVertex(p1mod);
      addVertex(p1);
    }

    function addVertex(point) {
      vertices[x] = point[0];
      vertices[x + 1] = point[1];
      vertices[x + 2] = 0.0;
      x += 3;
    }

    for (i = 0; i < paths.length; i++) {
      addVertex(paths[i][0]);
      for (j = 0; j < paths[i].length - 1; j++) {
        addSegment(paths[i][j], paths[i][j + 1]);
        if (j + 1 < paths.length - 1) addVertex(p1mod);
      }
      addVertex([paths[i].length - 1]);
    }
    return vertices;
  }

  function getVerticesForPolygons(polygons, numVertices) {
    var x = 0;
    var vertices = new Float32Array(numVertices * 3);

    function addVertex(point) {
      vertices[x] = point[0];
      vertices[x + 1] = point[1];
      vertices[x + 2] = 0.0;
      x += 3;
    }

    for (i = 0; i < polygons.length; i++) {
      var polygon = polygons[i];
      addVertex(polygon[0]);
      for (j = 1; j < polygon.length - 1; j += 2) {
        addVertex(polygon[0]);
        addVertex(polygon[j]);
        addVertex(polygon[j + 1]);
      }
      if (polygon.length % 2 == 0) addVertex(polygon[polygon.length - 1]);
      // Add the same point twice at the end of the polygon to produce degenerate triangles.
      addVertex(polygon[0]);
      addVertex(polygon[0]);
    }
    return vertices;
  }

  function getVerticesForPointsOfInterest(pointsOfInterest) {
    var x = 0;
    var vertices = new Float32Array(pointsOfInterest.length * 10 * 3);

    function pointOfInterestStar(poi) {
      var lon = poi.longitude;
      var lat = poi.latitude;
      return [
        [lon - 1.0, lat + 0.5],
        [lon + 1.0, lat + 0.5],
        [lon, lat - 1.0],
        [lon - 1.0, lat - 0.5],
        [lon + 1.0, lat - 0.5],
        [lon, lat + 1.0]
      ];
    }

    function addVertex(point) {
      vertices[x] = point[0];
      vertices[x + 1] = point[1];
      vertices[x + 2] = 0.0;
      x += 3;
    }

    for (i = 0; i < pointsOfInterest.length; i++) {
      var star = pointOfInterestStar(pointsOfInterest[i]);
      addVertex(star[0]);
      addVertex(star[0]);
      addVertex(star[1]);
      addVertex(star[2]);
      addVertex(star[2]);
      addVertex(star[3]);
      addVertex(star[3]);
      addVertex(star[4]);
      addVertex(star[5]);
      addVertex(star[5]);
    }
    return vertices;
  }

  function mvTranslate(v, mvMatrix) {
    return mvMatrix.x(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
  }

  function setMatrixUniforms(gl, perspectiveMatrix, mvMatrix, shaderProgram) {
    var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    gl.uniformMatrix4fv(
      pUniform,
      false,
      new Float32Array(perspectiveMatrix.flatten())
    );

    var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
  }

  function updatePolygons(ps) {
    polygons = ps;
    numPolygonVertices = countVerticesForPolygons(ps);
    updateBuffers();
    drawScene();
  }

  function updatePointsOfInterest(ps) {
    pointsOfInterest = ps;
    pointOfInterestVertices = getVerticesForPointsOfInterest(pointsOfInterest);
    pointOfInterestColours = getColoursForPointsOfInterest(pointsOfInterest);
    numPointOfInterestVertices = ps.length * 10;
    updateBuffers();
    drawScene();
  }

  function recolourPolygon(index, colour, feature) {
    var colours = getColoursForPolygons(polygons, numPolygonVertices, feature);
    colourArray.set(colours);
    var offset = countVerticesForPolygons(polygons, index);
    var length = countVerticesForPolygons(polygons, index + 1) - offset;
    for (var i = 0; i < length; i++) {
      colourArray.set(colour, (offset + i) * 4);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colourBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colourArray, gl.STATIC_DRAW);
    drawScene();
  }

  function recolourPolygons(feature) {
    var colours = getColoursForPolygons(polygons, numPolygonVertices, feature);
    colourArray.set(colours);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colourBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colourArray, gl.STATIC_DRAW);
    drawScene();
  }

  function drawScene() {
    if (!initialized) {
      return;
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, width, height);

    perspectiveMatrix = makePerspective(45, width / height, 0.001, 1000.0);

    for (var i = 0; i < repetitions.length; i++) {
      mvMatrix = mvTranslate(
        [xpos + repetitions[i][0], ypos + repetitions[i][1], -fov / zpos],
        Matrix.I(4)
      );
      setMatrixUniforms(gl, perspectiveMatrix, mvMatrix, shaders.shaderProgram);

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.verticesBuffer);
      gl.vertexAttribPointer(
        shaders.vertexPositionAttribute,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colourBuffer);
      gl.vertexAttribPointer(
        shaders.vertexColourAttribute,
        4,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.drawArrays(
        gl.TRIANGLE_STRIP,
        0,
        numPolygonVertices + numPathVertices + numPointOfInterestVertices
      );
    }
  }

  function checkScene() {
    if (!initialized) {
      console.error("Intialize webgl before using this function.");
      return;
    }
    if (dxBuffer !== 0 || dxBuffer !== 0 || windowChanged) {
      windowChanged = false;
      xpos += dxBuffer * 0.2 / zpos;
      xpos = xpos % 360;
      ypos += dyBuffer * 0.2 / zpos;
      ypos = ypos % 180;
      dxBuffer = 0;
      dyBuffer = 0;
      if (zpos < 1.0) {
        zpos = 1.0;
        if (Math.abs(xpos) <= 5.0) {
          xpos = 0.0;
        } else if (xpos > 5.0) {
          dxBuffer -= 20;
        } else {
          dxBuffer += 20;
        }
        if (Math.abs(ypos) <= 5.0) {
          ypos = 0.0;
        } else if (ypos > 5.0) {
          dyBuffer -= 50;
        } else {
          dyBuffer += 50;
        }
      }
      boundingBox = canvas.getBoundingClientRect();
      drawScene();
    }
    window.requestAnimationFrame(checkScene);
  }

  function updateViewport(ex, ey, dz, dx, dy, newWidth, newHeight) {
    if (typeof newWidth === "number") width = newWidth;
    if (typeof newHeight === "number") height = newHeight;
    if (typeof newWidth === "number" || typeof newHeight === "number")
      boundingBox = canvas.getBoundingClientRect();

    if (typeof dz === "number") {
      // xpos and ypos should be set such that the current lat,lon is still under ex,ey after the zoom.
      var currentLatLon = getLatLon(ex, ey);

      var nativeX = ex / width * 2 - 1.0;
      var nativeY = -(ey / height * 2 - 1.0);

      zpos *= 1 + dz / 1000;
      if (zpos > 1.0) {
        var latHeight = Math.tan(0.125 * Math.PI) * fov / zpos;
        var lonWidth = latHeight * (width / height);
        xpos = nativeX * lonWidth - currentLatLon[0];
        ypos = nativeY * latHeight - currentLatLon[1];
      }
    } else if (typeof dx === "number" && typeof dy === "number") {
      dxBuffer += dx;
      dyBuffer += dy;
    }
    windowChanged = true;
  }

  function getLatLon(ex, ey) {
    if (!initialized) {
      console.error("Intialize webgl before using this function.");
      return;
    }

    var latHeight = Math.tan(0.125 * Math.PI) * fov / zpos;
    var lonWidth = latHeight * (width / height);
    var nativeX = ex / width * 2 - 1.0;
    var nativeY = -(ey / height * 2 - 1.0);
    return [
      (nativeX * lonWidth - xpos + 180) % 360 - 180,
      (nativeY * latHeight - ypos + 90) % 180 - 90
    ];
  }

  function initialize(canvasElement, polygonArray, pathArray, poiArray) {
    polygons = polygonArray;
    paths = pathArray;
    canvas = canvasElement;

    if (typeof poiArray !== "undefined") {
      pointsOfInterest = poiArray;
    } else {
      pointsOfInterest = [];
    }

    width = canvas.width;
    height = canvas.height;
    boundingBox = canvas.getBoundingClientRect();

    numPolygonVertices = countVerticesForPolygons(polygons);
    numPathVertices = countVerticesForPaths(paths);

    gl = initWebGL(canvas);
    shaders = initShaders();
    buffers = initBuffers();
    initialized = true;
    updateBuffers();
    window.requestAnimationFrame(checkScene);
  }

  function updateBuffers() {
    if (!initialized) return;

    vertexArray = new Float32Array(
      (numPolygonVertices + numPathVertices + numPointOfInterestVertices) * 3
    );

    vertexArray.set(polygonVertices);
    vertexArray.set(pathVertices, numPolygonVertices * 3);
    vertexArray.set(
      pointOfInterestVertices,
      (numPolygonVertices + numPathVertices) * 3
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

    colourArray = new Float32Array(
      (numPolygonVertices + numPathVertices + numPointOfInterestVertices) * 4
    );

    colourArray.set(polygonColours);
    colourArray.set(pathColours, numPolygonVertices * 4);
    colourArray.set(
      pointOfInterestColours,
      (numPolygonVertices + numPathVertices) * 4
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colourBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colourArray, gl.STATIC_DRAW);
  }

  return {
    initialize: initialize,
    drawScene: drawScene,
    checkScene: checkScene,
    getLatLon: getLatLon,
    updateViewport: updateViewport,
    updatePolygons: updatePolygons,
    updatePointsOfInterest: updatePointsOfInterest,
    recolourPolygons: recolourPolygons,
    recolourPolygon: recolourPolygon
  };
})();
