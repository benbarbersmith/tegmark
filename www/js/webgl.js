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

  return gl;
}

function initShaders(gl) {
  var fragmentShader = loadShader(gl, "shader-fs");
  var vertexShader = loadShader(gl, "shader-vs");

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

function loadShader(gl, id) {
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
      "An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader)
    );
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initBuffers(gl, polygons, points) {
  var buffers = getVertices(polygons, points);
  var cellVerticesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cellVerticesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, buffers.vertices, gl.STATIC_DRAW);
  var cellVerticesColourBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cellVerticesColourBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, buffers.colours, gl.STATIC_DRAW);
  return {
    cellVerticesBuffer: cellVerticesBuffer,
    cellVerticesColourBuffer: cellVerticesColourBuffer
  };
}

function startRendering(canvas, polygons, points) {
  var windowChanged = true;
  var dxBuffer = 0.0, dyBuffer = 0.0;
  var xpos = 0.0, ypos = 0.0, zpos = 1.0;
  var fov = 90.0 / Math.tan(0.125 * Math.PI);
  var width = canvas.width;
  var height = canvas.height;
  var boundingBox = canvas.getBoundingClientRect();

  var points = countPoints(polygons);
  var gl = initWebGL(canvas);
  var shaders = initShaders(gl);
  var buffers = initBuffers(gl, polygons, points);

  var perspectiveMatrix, mvMatrix;

  function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, width, height);

    perspectiveMatrix = makePerspective(45, width / height, 0.001, 1000.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cellVerticesBuffer);
    gl.vertexAttribPointer(
      shaders.vertexPositionAttribute,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cellVerticesColourBuffer);
    gl.vertexAttribPointer(
      shaders.vertexColourAttribute,
      4,
      gl.FLOAT,
      false,
      0,
      0
    );

    for (var i = 0; i < repetitions.length; i++) {
      mvMatrix = mvTranslate(
        [xpos + repetitions[i][0], ypos + repetitions[i][1], -fov / zpos],
        Matrix.I(4)
      );
      setMatrixUniforms(gl, perspectiveMatrix, mvMatrix, shaders.shaderProgram);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, points);
    }
  }

  function checkScene() {
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
    if (typeof dz === "number") {
      // xpos and ypos should be set such that the current lat,lon is still under ex,ey after the zoom.
      var currentLatLon = getLatLon(ex, ey);
      var nativeX = (ex - Math.floor(boundingBox.left)) / canvas.width * 2.0 -
        1.0;
      var nativeY = -((ey - Math.floor(boundingBox.top)) / canvas.height * 2.0 -
        1.0);
      zpos *= 1 + dz / 1000;
      if (zpos > 1.0) {
        var newScalingFactor = Math.tan(0.125 * Math.PI) * fov / zpos;
        xpos = nativeX * newScalingFactor * 2 - currentLatLon[0];
        ypos = nativeY * newScalingFactor - currentLatLon[1];
      }
    } else if (typeof dx === "number" && typeof dy === "number") {
      dxBuffer += dx;
      dyBuffer += dy;
    }
    if (typeof newWidth === "number") width = newWidth;
    if (typeof newHeight === "number") height = newHeight;
    windowChanged = true;
  }

  function getLatLon(ex, ey) {
    var nativeX = (ex - Math.floor(boundingBox.left)) / canvas.width * 2.0 -
      1.0;
    var nativeY = -((ey - Math.floor(boundingBox.top)) / canvas.height * 2.0 -
      1.0);
    var scalingFactor = Math.tan(0.125 * Math.PI) * fov / zpos;
    return [
      (nativeX * scalingFactor * 2 - xpos + 180) % 360 - 180,
      (nativeY * scalingFactor - ypos + 90) % 180 - 90
    ];
  }

  window.requestAnimationFrame(checkScene);
  return {
    updateViewport: updateViewport,
    getLatLon: getLatLon
  };
}

function countPoints(polygons) {
  var n = 0;
  var vs = 0;
  for (var i = 0; i < polygons.length; i++) {
    var ps = polygons[i].length;
    n += ps;
    // For triangle strip, need to add one extra point for every two points in a polygon, plus two more points for the denegerate triangle.
    vs += ps + Math.floor(ps / 2) + 3;
  }
  console.log("Total points in all polygons: " + n);
  console.log("Total required vertices: " + vs);
  return vs;
}

function getVertices(polygons, points) {
  var x = 0, y = 0;
  var vertices = new Float32Array(points * 3);
  var colours = new Float32Array(points * 4);

  function addPoint(point, colour) {
    vertices[x] = point[0];
    vertices[x + 1] = point[1];
    vertices[x + 2] = 0.0;
    x += 3;

    colours[y] = colour[0];
    colours[y + 1] = colour[1];
    colours[y + 2] = colour[2];
    colours[y + 3] = 1.0; // Full opacity;
    y += 4;
  }

  for (i = 0; i < polygons.length; i++) {
    var colour = polygons[i].colour;
    addPoint(polygons[i][0], colour);
    addPoint(polygons[i][0], colour);
    for (j = 1; j < polygons[i].length; j += 2) {
      addPoint(polygons[i][j], colour);

      if (j + 1 > polygons[i].length - 1) {
        break;
      } else {
        addPoint(polygons[i][j + 1], colour);
      }

      if (j + 2 > polygons[i].length - 1) {
        break;
      } else {
        // Add first point in polygon to as part of constructing the triangle strip.
        addPoint(polygons[i][0], colour);
      }
    }
    // Add the same point twice at the end of the polygon to produce degenerate triangles.
    addPoint(polygons[i][0], colour);
    addPoint(polygons[i][0], colour);
  }

  return {
    vertices: vertices,
    colours: colours
  };
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

