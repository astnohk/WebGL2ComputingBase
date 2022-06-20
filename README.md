# WebGL2ComputingBase
The simple WebGL2 float value computing sample.

Just using framebuffer (color buffer only) to store computing results produced by GLSL program.
It initiate texture in framebuffer by Float32Array in initializing function.
And it just spreading colors by using the simple mean filter:
```
0.0, 0.2, 0.0,
0.2, 0.2, 0.2,
0.0, 0.2, 0.0
```
