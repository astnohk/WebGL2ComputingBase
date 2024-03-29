"use strict";


window.onload = init;

const width = 1600;
const height = 1600;

let filter;

function init()
{
	const canvas = document.getElementById('mainCanvas');
    filter = new Filter(canvas, width, height);

	initRange();
	initDropFileHandler();

    updateSigmaValue();
}

function initRange()
{
	document.getElementById('sigmaRange').addEventListener(
        'change',
        () => {
            updateSigmaValue();
            updateTexture();
        }
    );
}

function updateSigmaValue()
{
    const e = document.getElementById('sigmaRange');
    const kernelSize = 3 * e.valueAsNumber * 2 + 1;
    document.getElementById('sigma').innerHTML = `&sigma;=${e.valueAsNumber}, kernel_size=${kernelSize}`;
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
    const sigmaRange = document.getElementById('sigmaRange');
	filter.input(image, sigmaRange.valueAsNumber);
}

