"use strict";


window.onload = init;

const width = 800;
const height = 800;


function init()
{
	const canvas = document.getElementById('mainCanvas');
	canvas.width = width;
	canvas.height = height;
	const gl = canvas.getContext('webgl2');
	// Enable FLOAT-type in framebuffer's color
	gl.getExtension('EXT_color_buffer_float');

	const computingShader = initializeWebGLComputing(gl, vs_calc, fs_calc);
	const drawingShader = initializeWebGLDrawing(gl, vs_draw, fs_draw);

	// Create framebuffers
	const initial_value = new Float32Array(width * height * 4);
	for (let y = 0; y < height; ++y) {
		for (let x = 0; x < width; ++x) {
			initial_value[4 * (width * y + x) + 0] = 0.0; // red
			initial_value[4 * (width * y + x) + 1] = 0.0; // green
			initial_value[4 * (width * y + x) + 2] = 0.0; // blue
			initial_value[4 * (width * y + x) + 3] = 1.0; // alpha
		}
	}
	for (let y = 400; y < 500; ++y) {
		for (let x = 400; x < 500; ++x) {
			initial_value[4 * (width * y + x) + 0] = 1.0;
			initial_value[4 * (width * y + x) + 1] = 1.0;
		}
	}
	const calculateBuffers = new Array(2);
	calculateBuffers[0] = createFramebuffer(gl, width, height, initial_value);
	calculateBuffers[1] = createFramebuffer(gl, width, height, null);
	// Create computing & drawing panel
	const panel = createPanel(gl);

	const r = () => {
		calculate(gl, computingShader.shaderProgram, computingShader.programInfo, calculateBuffers, panel);

		// Increment buffer head position
		calculateFramebufferIndex = (calculateFramebufferIndex + 1) % 2;

		// Draw results
		render(gl, drawingShader.shaderProgram, drawingShader.programInfo, calculateBuffers, panel);

		// Set next render
		requestAnimationFrame(r);
	};
	// Start computing & rendering
	requestAnimationFrame(r);
}




////////////////////////////////////////////////////////////////
// GLSL
////////////////////////////////////////////////////////////////
// Computing
const vs_calc =
`#version 300 es
precision highp float;

in vec4 aVertexPosition;
in vec2 aVertexTextureCoord;

out vec2 vTextureCoord;

void main(void) {
	gl_Position = aVertexPosition;
	vTextureCoord = aVertexTextureCoord;
}
`;

const fs_calc =
`#version 300 es
precision highp float;

in vec2 vTextureCoord;

uniform float uWidth;
uniform float uHeight;
uniform sampler2D uTexture;

out vec4 fragmentColor;

void main(void) {
	fragmentColor = (
			texture(uTexture, vec2((gl_FragCoord.x) / uWidth, (gl_FragCoord.y) / uHeight)) +
			texture(uTexture, vec2((gl_FragCoord.x - 1.0) / uWidth, (gl_FragCoord.y) / uHeight)) +
			texture(uTexture, vec2((gl_FragCoord.x + 1.0) / uWidth, (gl_FragCoord.y) / uHeight)) +
			texture(uTexture, vec2((gl_FragCoord.x) / uWidth, (gl_FragCoord.y - 1.0) / uHeight)) +
			texture(uTexture, vec2((gl_FragCoord.x) / uWidth, (gl_FragCoord.y + 1.0) / uHeight))
		) / 5.0;
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

uniform float uWidth;
uniform float uHeight;
uniform sampler2D uTexture;

out vec4 fragmentColor;

void main(void) {
	fragmentColor = texture(uTexture, vec2(gl_FragCoord.x / uWidth, gl_FragCoord.y / uHeight));
}
`;
////////////////////////////////////////////////////////////////


function initializeWebGLComputing(gl, vsSource, fsSource)
{
	const shaderProgram = initializeShaderProgram(gl, vsSource, fsSource);
	const programInfo = {
		shaderProgram: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
			vertexTextureCoord: gl.getAttribLocation(shaderProgram, 'aVertexTextureCoord'),
		},
		uniformLocations: {
			width: gl.getUniformLocation(shaderProgram, 'uWidth'),
			height: gl.getUniformLocation(shaderProgram, 'uHeight'),
			texture: gl.getUniformLocation(shaderProgram, 'uTexture'),
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
			texture: gl.getUniformLocation(shaderProgram, 'uTexture'),
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




var calculateFramebufferIndex = 0;
function calculate(gl, shaderProgram, programInfo, calculateBuffers, panel)
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
	    programInfo.uniformLocations.texture,
	    0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, calculateBuffers[calculateFramebufferIndex].texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	setAttribute(programInfo.attribLocations.vertexPosition, panel.position);
	setAttribute(programInfo.attribLocations.vertexTextureCoord, panel.textureCoord);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, panel.index.buffer);

	// Draw surface by TRIANGLES
	const offset = 0;
	gl.drawElements(
	    gl.TRIANGLES,
	    panel.index.elements.length,
	    panel.index.type,
	    offset);
}

function render(gl, shaderProgram, programInfo, calculateBuffers, panel)
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
	    programInfo.uniformLocations.texture,
	    0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, calculateBuffers[calculateFramebufferIndex].texture); // Set result
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

