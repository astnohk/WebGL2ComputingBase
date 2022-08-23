"use strict";


window.onload = init;

const width = 800;
const height = 800;
const default_kernel_size = 25.0;

var inputImage = null;
var doInitialize = true;
var calculateFramebufferIndex = 0;

function init()
{
	initRange();
	initDropFileHandler();

	const canvas2d = document.getElementById('inputImageCanvas');
	canvas2d.width = width;
	canvas2d.height = height;

	const canvas = document.getElementById('mainCanvas');
	canvas.width = width;
	canvas.height = height;
	const gl = canvas.getContext('webgl2');
	// Enable FLOAT-type in framebuffer's color
	gl.getExtension('EXT_color_buffer_float');

	const initializingShader = initializeWebGLInitializing(gl, vs_init, fs_init);
	const computingShader = initializeWebGLComputing(gl, vs_calc, fs_calc);
	const drawingShader = initializeWebGLDrawing(gl, vs_draw, fs_draw);

	// Create framebuffers
	const image = document.getElementById('inputImage');
	inputImage = getFloat32Image(image);
	// Input texture
	const inputTexture = createTexture(gl, width, height, inputImage);
	// Framebuffers for computing
	const calculateBuffers = new Array(2);
	calculateBuffers[0] = createFramebuffer(gl, width, height, null);
	calculateBuffers[1] = createFramebuffer(gl, width, height, null);
	// Create computing & drawing panel
	const panel = createPanel(gl);

	const r = () => {
		if (doInitialize) {
			// Initialize framebuffer's texture
			initialize(gl, initializingShader.shaderProgram, initializingShader.programInfo, calculateBuffers, panel);
			doInitialize = false;
			calculateFramebufferIndex = 0;
		}

		calculate(gl, computingShader.shaderProgram, computingShader.programInfo, calculateBuffers, panel, inputTexture, inputImage);

		// Increment buffer head position
		calculateFramebufferIndex = (calculateFramebufferIndex + 1) % 2;

		// Draw results
		render(gl, drawingShader.shaderProgram, drawingShader.programInfo, calculateBuffers, panel, inputTexture, inputImage);

		// Set next render
		requestAnimationFrame(r);
	};
	// Start computing & rendering
	requestAnimationFrame(r);
}

function initRange()
{
	document.getElementById('kernelSize').value = default_kernel_size;
}

function initDropFileHandler()
{
	document.getElementById('inputImage').addEventListener('load', updateTexture);

	window.addEventListener(
	    'dragover',
	    (e) => { e.preventDefault(); });
	window.addEventListener(
	    'drop',
	    (e) => {
		    e.preventDefault();
		    if (e.dataTransfer.items) {
			    for (let i = 0; i < e.dataTransfer.items.length; ++i) {
				    if (e.dataTransfer.items[i].kind === 'file') {
					    const oldURL = document.getElementById('inputImage').src;
					    URL.revokeObjectURL(oldURL);
					    const file = e.dataTransfer.items[i].getAsFile();
					    document.getElementById('inputImage').src = URL.createObjectURL(file);
				    }
			    }
		    } else {
			    for (let i = 0; i < e.dataTransfer.files.length; ++i) {
				    const file = e.dataTransfer.files[i];
				    const oldURL = document.getElementById('inputImage').src;
				    URL.revokeObjectURL(oldURL);
				    document.getElementById('inputImage').src = URL.createObjectURL(file);
			    }
		    }
	    });
}

function updateTexture()
{
	// Update texture
	const image = document.getElementById('inputImage');
	inputImage = getFloat32Image(image);

	// Trigger computing buffer initializing
	doInitialize = true;
}

function getFloat32Image(image)
{
	const imageBuffer = getUint8ImageBuffer(image);
	// Create framebuffers
	const initial_value = new Float32Array(width * height * 4);
	for (let y = 0; y < height; ++y) {
		for (let x = 0; x < width; ++x) {
			initial_value[4 * (width * y + x) + 0] = (imageBuffer.data[4 * (width * y + x) + 0]) / 255.0; // red
			initial_value[4 * (width * y + x) + 1] = (imageBuffer.data[4 * (width * y + x) + 1]) / 255.0; // green
			initial_value[4 * (width * y + x) + 2] = (imageBuffer.data[4 * (width * y + x) + 2]) / 255.0; // blue
			initial_value[4 * (width * y + x) + 3] = (imageBuffer.data[4 * (width * y + x) + 3]) / 255.0; // alpha
		}
	}

	return initial_value;
}

function getUint8ImageBuffer(image)
{
	const canvas = document.getElementById('inputImageCanvas');
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, width, height);

	const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
	ctx.drawImage(image, 0, 0, scale * image.naturalWidth, scale * image.naturalHeight);

	return ctx.getImageData(0, 0, width, height);
}




////////////////////////////////////////////////////////////////
// GLSL
////////////////////////////////////////////////////////////////
// Initializing
const vs_init =
`#version 300 es
precision highp float;

in vec4 aVertexPosition;

void main(void) {
	gl_Position = aVertexPosition;
}
`;

const fs_init =
`#version 300 es
precision highp float;

uniform float uWidth;
uniform float uHeight;

out vec4 fragmentColor;

void main(void) {
	fragmentColor = vec4(gl_FragCoord.x / uWidth, gl_FragCoord.y / uHeight, 0.0, 1.0);
}
`;

// Computing
const vs_calc =
`#version 300 es
precision highp float;

in vec4 aVertexPosition;

void main(void) {
	gl_Position = aVertexPosition;
}
`;

const fs_calc =
`#version 300 es
precision highp float;

uniform float uWidth;
uniform float uHeight;
uniform sampler2D uBufferTexture;
uniform sampler2D uInputTexture;
uniform float uKernelSize;

out vec4 fragmentColor;

void main(void) {
	vec2 origin = vec2(gl_FragCoord.x / uWidth, gl_FragCoord.y / uHeight).xy;
	vec3 center_color = texture(uInputTexture, origin).rgb;
	vec2 r = texture(uBufferTexture, origin).xy;

	float count = 0.0;
	vec2 dr_sum = vec2(0.0);
	for (float y = -uKernelSize; y <= uKernelSize; y += 1.0) {
		for (float x = -uKernelSize; x <= uKernelSize; x += 1.0) {
			vec2 dr = vec2(x / uWidth, y / uHeight);
			if (length(texture(uInputTexture, r + dr).rgb - center_color) < 0.1) {
				//dr_sum += dr;
				//count += 1.0;
				dr_sum += dr * (uKernelSize - length(dr)) / uKernelSize;
				count += 1.0;
			}
		}
	}
	fragmentColor = vec4(r + 0.1 * dr_sum / max(1.0, count), 0.0, 1.0);
}
`;

// Drawing
const vs_draw =
`#version 300 es
precision highp float;

in vec4 aVertexPosition;

void main(void) {
	gl_Position = aVertexPosition;
}
`;

const fs_draw =
`#version 300 es
precision highp float;

const float PI = 3.141592653589793238462643383279;
const float meanShiftVectorColorScale = 200.0;

uniform float uWidth;
uniform float uHeight;
uniform sampler2D uBufferTexture;
uniform sampler2D uInputTexture;
uniform float uKernelSize;

out vec4 fragmentColor;

vec3 hls2rgb(float h, float l, float s) {
	float max = l + s * 0.5;
	float min = l - s * 0.5;
	if (h < 60.0) {
		return vec3(max, min + (max - min) * h / 60.0, min);
	} else if (h < 120.0) {
		return vec3(min + (max - min) * (120.0 - h) / 60.0, max, min);
	} else if (h < 180.0) {
		return vec3(min, max, min + (max - min) * (h - 120.0) / 60.0);
	} else if (h < 240.0) {
		return vec3(min, min + (max - min) * (240.0 - h) / 60.0, max);
	} else if (h < 300.0) {
		return vec3(min + (max - min) * (h - 240.0) / 60.0, min, max);
	} else {
		return vec3(max, min, min + (max - min) * (360.0 - h) / 60.0);
	}
}

void main(void) {
	vec2 origin = vec2(gl_FragCoord.x / uWidth, 1.0 - gl_FragCoord.y / uHeight).xy;
	vec2 r = texture(uBufferTexture, origin).xy;

	float angle = atan(r.y - origin.y, r.x - origin.x) / PI;
	float angleDeg = angle >= 0.0 ? angle * 180.0 : (angle + 2.0) * 180.0;
	vec3 color = hls2rgb(angleDeg, 1.0, 1.0) * meanShiftVectorColorScale * length(r - origin) / uKernelSize;
	//fragmentColor = texture(uInputTexture, r);
	fragmentColor = vec4(color, 1.0);
}
`;
////////////////////////////////////////////////////////////////

function initializeWebGLInitializing(gl, vsSource, fsSource)
{
	const shaderProgram = initializeShaderProgram(gl, vsSource, fsSource);
	const programInfo = {
		shaderProgram: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
		},
		uniformLocations: {
			width: gl.getUniformLocation(shaderProgram, 'uWidth'),
			height: gl.getUniformLocation(shaderProgram, 'uHeight'),
		},
	};
	return {
		shaderProgram: shaderProgram,
		programInfo: programInfo,
	};
}

function initializeWebGLComputing(gl, vsSource, fsSource)
{
	const shaderProgram = initializeShaderProgram(gl, vsSource, fsSource);
	const programInfo = {
		shaderProgram: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
		},
		uniformLocations: {
			width: gl.getUniformLocation(shaderProgram, 'uWidth'),
			height: gl.getUniformLocation(shaderProgram, 'uHeight'),
			bufferTexture: gl.getUniformLocation(shaderProgram, 'uBufferTexture'),
			inputTexture: gl.getUniformLocation(shaderProgram, 'uInputTexture'),
			kernelSize: gl.getUniformLocation(shaderProgram, 'uKernelSize'),
		},
	};
	return {
		shaderProgram: shaderProgram,
		programInfo: programInfo,
	};
}

function initializeWebGLDrawing(gl, vsSource, fsSource)
{
	const shaderProgram = initializeShaderProgram(gl, vsSource, fsSource);
	const programInfo = {
		shaderProgram: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
		},
		uniformLocations: {
			width: gl.getUniformLocation(shaderProgram, 'uWidth'),
			height: gl.getUniformLocation(shaderProgram, 'uHeight'),
			bufferTexture: gl.getUniformLocation(shaderProgram, 'uBufferTexture'),
			inputTexture: gl.getUniformLocation(shaderProgram, 'uInputTexture'),
			kernelSize: gl.getUniformLocation(shaderProgram, 'uKernelSize'),
		},
	};
	return {
		shaderProgram: shaderProgram,
		programInfo: programInfo,
	};
}

function createPanel(gl)
{
	let positionBuffer = gl.createBuffer();
	const pos = new Float32Array([
	    -1.0, -1.0, 0.0,
	     1.0, -1.0, 0.0,
	     1.0,  1.0, 0.0,
	    -1.0,  1.0, 0.0,
	]);
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(
	    gl.ARRAY_BUFFER,
	    pos,
	    gl.STATIC_DRAW);

	let textureBuffer = gl.createBuffer();
	let tex = new Float32Array([
	    0.0, 0.0,
	    1.0, 0.0,
	    1.0, 1.0,
	    0.0, 1.0,
	]);
	gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
	gl.bufferData(
	    gl.ARRAY_BUFFER,
	    tex,
	    gl.STATIC_DRAW);

	const indexBuffer = gl.createBuffer();
	const index = new Uint16Array([
	    0, 1, 2,
	    0, 2, 3,
	]);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(
	    gl.ELEMENT_ARRAY_BUFFER,
	    index,
	    gl.STATIC_DRAW);

	return {
		position: { elements: pos, buffer: positionBuffer, type: gl.FLOAT, numComponents: 3, normalize: false },
		textureCoord: { elements: tex, buffer: textureBuffer, type: gl.FLOAT, numComponents: 2, normalize: false },
		index: { elements: index, buffer: indexBuffer, type: gl.UNSIGNED_SHORT },
	};
}




function initialize(gl, shaderProgram, programInfo, calculateBuffers, panel)
{
	gl.useProgram(shaderProgram);

	gl.bindFramebuffer(gl.FRAMEBUFFER, calculateBuffers[0].framebuffer);

	// Clear
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.depthFunc(gl.LEQUAL);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const setAttribute = (attribLocation, element) => {
		gl.bindBuffer(gl.ARRAY_BUFFER, element.buffer);
		const stride = 0;
		const offset = 0;
		gl.vertexAttribPointer(
		    attribLocation,
		    element.numComponents,
		    element.type,
		    element.normalize,
		    stride,
		    offset);
		gl.enableVertexAttribArray(attribLocation);
	};

	gl.uniform1f(
	    programInfo.uniformLocations.width,
	    width);
	gl.uniform1f(
	    programInfo.uniformLocations.height,
	    height);

	setAttribute(programInfo.attribLocations.vertexPosition, panel.position);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, panel.index.buffer);

	// Draw surface by TRIANGLES
	const offset = 0;
	gl.drawElements(
	    gl.TRIANGLES,
	    panel.index.elements.length,
	    panel.index.type,
	    offset);
}

function calculate(gl, shaderProgram, programInfo, calculateBuffers, panel, inputTexture, inputImage)
{
	gl.useProgram(shaderProgram);

	gl.bindFramebuffer(gl.FRAMEBUFFER, calculateBuffers[(calculateFramebufferIndex + 1) % 2].framebuffer);

	// Clear
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.depthFunc(gl.LEQUAL);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const setAttribute = (attribLocation, element) => {
		gl.bindBuffer(gl.ARRAY_BUFFER, element.buffer);
		const stride = 0;
		const offset = 0;
		gl.vertexAttribPointer(
		    attribLocation,
		    element.numComponents,
		    element.type,
		    element.normalize,
		    stride,
		    offset);
		gl.enableVertexAttribArray(attribLocation);
	};

	gl.uniform1f(
	    programInfo.uniformLocations.width,
	    width);
	gl.uniform1f(
	    programInfo.uniformLocations.height,
	    height);
	gl.uniform1i(
	    programInfo.uniformLocations.bufferTexture,
	    0);
	gl.uniform1i(
	    programInfo.uniformLocations.inputTexture,
	    1);
	gl.uniform1f(
	    programInfo.uniformLocations.kernelSize,
	    document.getElementById('kernelSize').valueAsNumber);

	// Texture of framebuffer
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, calculateBuffers[calculateFramebufferIndex].texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	// Texture of input image
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, inputTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, inputImage);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	setAttribute(programInfo.attribLocations.vertexPosition, panel.position);
	//setAttribute(programInfo.attribLocations.vertexTextureCoord, panel.textureCoord);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, panel.index.buffer);

	// Draw surface by TRIANGLES
	const offset = 0;
	gl.drawElements(
	    gl.TRIANGLES,
	    panel.index.elements.length,
	    panel.index.type,
	    offset);
}

function render(gl, shaderProgram, programInfo, calculateBuffers, panel, inputTexture, inputImage)
{
	gl.useProgram(shaderProgram);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	// Clear
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.depthFunc(gl.LEQUAL);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const setAttribute = (attribLocation, element) => {
		gl.bindBuffer(gl.ARRAY_BUFFER, element.buffer);
		const stride = 0;
		const offset = 0;
		gl.vertexAttribPointer(
		    attribLocation,
		    element.numComponents,
		    element.type,
		    element.normalize,
		    stride,
		    offset);
		gl.enableVertexAttribArray(attribLocation);
	};

	gl.uniform1f(
	    programInfo.uniformLocations.width,
	    width);
	gl.uniform1f(
	    programInfo.uniformLocations.height,
	    height);
	gl.uniform1i(
	    programInfo.uniformLocations.bufferTexture,
	    0);
	gl.uniform1i(
	    programInfo.uniformLocations.inputTexture,
	    1);
	gl.uniform1f(
	    programInfo.uniformLocations.kernelSize,
	    document.getElementById('kernelSize').valueAsNumber);

	// Texture of framebuffer
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, calculateBuffers[calculateFramebufferIndex].texture); // Set result
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	// Texture of input image
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, inputTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, inputImage);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	setAttribute(programInfo.attribLocations.vertexPosition, panel.position);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, panel.index.buffer);

	// Draw surface by TRIANGLES
	const offset = 0;
	gl.drawElements(
	    gl.TRIANGLES,
	    panel.index.elements.length,
	    panel.index.type,
	    offset);
}

