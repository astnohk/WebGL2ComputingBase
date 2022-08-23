"use strict";


class Filter
{
    constructor(canvas, width, height) {
        this.width = width;
        this.height = height;
        this.canvas = canvas;
        this.canvas.width = width;
        this.canvas.height = height;
        // Shader programs
        const vs =
`#version 300 es
precision highp float;

in vec4 aVertexPosition;

void main(void) {
	gl_Position = aVertexPosition;
}`;
        const fs =
`#version 300 es
precision highp float;

uniform float uWidth;
uniform float uHeight;
uniform sampler2D uFilterKernel;
uniform sampler2D uInputTexture;
uniform float uSigma;

out vec4 fragmentColor;

void main(void) {
	vec2 center = vec2(gl_FragCoord.x / uWidth, 1.0 - gl_FragCoord.y / uHeight).xy;

	vec4 sum = vec4(0.0);
    float sum_k = 0.0;
	for (float y = -uSigma * 3.0; y <= uSigma * 3.0; y += 1.0) {
		for (float x = -uSigma * 3.0; x <= uSigma * 3.0; x += 1.0) {
            float C = exp(-(x * x + y * y) / (2.0 * max(uSigma * uSigma, 1.0)));
			vec2 dr = vec2(x / uWidth, y / uHeight);
			sum += C * texture(uInputTexture, center + dr);
            sum_k += C;
		}
	}
	fragmentColor = sum / sum_k;
}`;
        this.gl = this.canvas.getContext('webgl2');
        // Enable FLOAT-type in framebuffer's color
        //gl.getExtension('EXT_color_buffer_float');
        this.shader = this.initializeWebGLDrawing(this.gl, vs, fs);
        // Create computing & drawing panel
        this.panel = this.createPanel(this.gl);
        // Create texture initialized with inputImage.
        this.kernelImage = document.createElement('canvas');
        this.kernelTexture = this.createTexture(this.gl, this.width, this.height, null);
        this.inputTexture = this.createTexture(this.gl, this.width, this.height, null);
    }

    initializeWebGLDrawing(gl, vsSource, fsSource)
    {
        const shaderProgram = this.initializeShaderProgram(gl, vsSource, fsSource);
        const programInfo = {
            shaderProgram: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                width: gl.getUniformLocation(shaderProgram, 'uWidth'),
                height: gl.getUniformLocation(shaderProgram, 'uHeight'),
                bufferTexture: gl.getUniformLocation(shaderProgram, 'uFilterKernel'),
                inputTexture: gl.getUniformLocation(shaderProgram, 'uInputTexture'),
                sigma: gl.getUniformLocation(shaderProgram, 'uSigma'),
            },
        };
        return {
            shaderProgram: shaderProgram,
            programInfo: programInfo,
        };
    }

    createTexture(gl, width, height, img)
    {
        const tx = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tx);
        const levelOfDetail = 0;
        gl.texImage2D(gl.TEXTURE_2D, levelOfDetail, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        return tx;
    }

    createPanel(gl)
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

    render(shaderProgram, programInfo, inputImage, sigma)
    {
        const gl = this.gl;
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
            this.width);
        gl.uniform1f(
            programInfo.uniformLocations.height,
            this.height);
        gl.uniform1i(
            programInfo.uniformLocations.kernelTexture,
            0);
        gl.uniform1i(
            programInfo.uniformLocations.inputTexture,
            1);
        gl.uniform1f(
            programInfo.uniformLocations.sigma,
            sigma);

        // Texture of framebuffer
        this.kernelImage.width = 3 * sigma * 2;
        this.kernelImage.height = 3 * sigma * 2;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.kernelTexture); // Set result
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // Texture of input image
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, inputImage);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, inputImage.naturalWidth, inputImage.naturalHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, inputImage);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        setAttribute(programInfo.attribLocations.vertexPosition, this.panel.position);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.panel.index.buffer);

        // Draw surface by TRIANGLES
        const offset = 0;
        gl.drawElements(
            gl.TRIANGLES,
            this.panel.index.elements.length,
            this.panel.index.type,
            offset);
    }

    initializeShaderProgram(gl, vsSource, fsSource)
    {
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

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

    loadShader(gl, type, source)
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


    // Input image (ImageElement, Canvas) and Draw filtered result.
    input(inputImage, sigma) {
		// Filter and Draw result.
		this.render(this.shader.shaderProgram, this.shader.programInfo, inputImage, sigma);
	}
}

