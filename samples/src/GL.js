"use strict";




////////////////////////////////////////////////////////////////
// WebGL
////////////////////////////////////////////////////////////////

function initializeShaderProgram(gl, vsSource, fsSource)
{
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.deleteShader(vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.deleteShader(fragmentShader);
	gl.linkProgram(shaderProgram);
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		document.write("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram) + "\n");
		return null;
	}
	return shaderProgram;
}

function loadShader(gl, type, source)
{
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		document.write("Failed to compile the shader program: " + gl.getShaderInfoLog(shader) + "\n");
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function createTexture(gl, width, height, img)
{
	const tx = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tx);
	const levelOfDetail = 0;
	gl.texImage2D(gl.TEXTURE_2D, levelOfDetail, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, img);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	return tx;
}

function createFramebuffer(gl, width, height, image)
{
	const framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return {
		framebuffer: framebuffer,
		texture: texture,
	};
}




////////////////////////////////////////////////////////////////
// Matrix
////////////////////////////////////////////////////////////////
function createIdenticalMat3() {
	let A = new Array(9);
	A[0] = 1.0; A[3] = 0.0; A[6] = 0.0;
	A[1] = 0.0; A[4] = 1.0; A[7] = 0.0;
	A[2] = 0.0; A[5] = 0.0; A[8] = 1.0;
	return A;
}

function createIdenticalMat4() {
	let A = new Array(16);
	A[0] = 1.0; A[4] = 0.0; A[8]  = 0.0; A[12] = 0.0;
	A[1] = 0.0; A[5] = 1.0; A[9]  = 0.0; A[13] = 0.0;
	A[2] = 0.0; A[6] = 0.0; A[10] = 1.0; A[14] = 0.0;
	A[3] = 0.0; A[7] = 0.0; A[11] = 0.0; A[15] = 1.0;
	return A;
}

function createPerspectiveMat4(fovy, aspect, near, far) {
	let A = new Array(16);
	const f = 1.0 / Math.tan(fovy / 2);
	A[0] = f / aspect;
	A[1] = 0;
	A[2] = 0;
	A[3] = 0;
	A[4] = 0;
	A[5] = f;
	A[6] = 0;
	A[7] = 0;
	A[8] = 0;
	A[9] = 0;
	A[10] = -(far + near) / (far - near);
	A[11] = -1;
	A[12] = 0;
	A[13] = 0;
	A[14] = 2 * far * near / (near - far);
	A[15] = 0;
	return A;
}

function createRotationMat4_x(rad) {
	let A = new Array(16);
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	A[0] = 1.0;
	A[1] = 0;
	A[2] = 0;
	A[3] = 0;
	A[4] = 0;
	A[5] = cos;
	A[6] = sin;
	A[7] = 0;
	A[8] = 0;
	A[9] = -sin;
	A[10] = cos;
	A[11] = 0;
	A[12] = 0;
	A[13] = 0;
	A[14] = 0;
	A[15] = 1.0;
	return A;
}

function createRotationMat4_y(rad) {
	let A = new Array(16);
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	A[0] = cos;
	A[1] = 0;
	A[2] = -sin;
	A[3] = 0;
	A[4] = 0;
	A[5] = 1.0;
	A[6] = 0;
	A[7] = 0;
	A[8] = sin;
	A[9] = 0;
	A[10] = cos;
	A[11] = 0;
	A[12] = 0;
	A[13] = 0;
	A[14] = 0;
	A[15] = 1.0;
	return A;
}

function createRotationMat4_z(rad) {
	let A = new Array(16);
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	A[0] = cos;
	A[1] = sin;
	A[2] = 0;
	A[3] = 0;
	A[4] = -sin;
	A[5] = cos;
	A[6] = 0;
	A[7] = 0;
	A[8] = 0;
	A[9] = 0;
	A[10] = 1.0;
	A[11] = 0;
	A[12] = 0;
	A[13] = 0;
	A[14] = 0;
	A[15] = 1.0;
	return A;
}


function multiplyMat4(dst, A, B) {
	const a11 = A[0], a21 = A[1], a31 = A[2], a41 = A[3],
	    a12 = A[4], a22 = A[5], a32 = A[6], a42 = A[7],
	    a13 = A[8], a23 = A[9], a33 = A[10], a43 = A[11],
	    a14 = A[12], a24 = A[13], a34 = A[14], a44 = A[15];
	const b11 = B[0], b21 = B[1], b31 = B[2], b41 = B[3],
	    b12 = B[4], b22 = B[5], b32 = B[6], b42 = B[7],
	    b13 = B[8], b23 = B[9], b33 = B[10], b43 = B[11],
	    b14 = B[12], b24 = B[13], b34 = B[14], b44 = B[15];

	dst[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
	dst[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
	dst[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
	dst[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;

	dst[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
	dst[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
	dst[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
	dst[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;

	dst[8]  = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
	dst[9]  = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
	dst[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
	dst[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;

	dst[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
	dst[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
	dst[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
	dst[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
}

function createVec4()
{
	let v = new Array(4);
	v[0] = 0.0;
	v[1] = 0.0;
	v[2] = 0.0;
	v[3] = 1.0;
	return v;
}

function createZerosMat4(initials = [])
{
	let A = new Array(16);
	for (let i = 0; i < Math.min(initials.length, 16); ++i) {
		A[i] = initials[i];
	}
	for (let i = initials.length; i < 16; ++i) {
		A[i] = 0.0;
	}
	return A;
}

function multiplyMatVec4(dst, A, v) {
	const v1 = v[0], v2 = v[1], v3 = v[2], v4 = v[3];
	dst[0] = A[0] * v1 + A[4] * v2 + A[8] * v3 + A[12] * v4;
	dst[1] = A[1] * v1 + A[5] * v2 + A[9] * v3 + A[13] * v4;
	dst[2] = A[2] * v1 + A[6] * v2 + A[10] * v3 + A[14] * v4;
	dst[3] = A[3] * v1 + A[7] * v2 + A[11] * v3 + A[15] * v4;
}

