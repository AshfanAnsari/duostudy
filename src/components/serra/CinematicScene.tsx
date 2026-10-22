import { useEffect, useRef, useState, useCallback } from 'react';
import type { FilmQuality, MediaManifest } from '../../types/serra';

interface CinematicSceneProps {
  progress: number; // 0 to 1
  quality: FilmQuality;
  manifest: MediaManifest;
  onVideoFrameReady: () => void;
  onPosterLoaded: () => void;
  onBufferProgress: (seconds: number) => void;
  videoRefOut?: (video: HTMLVideoElement | null) => void;
}

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_scene;
uniform sampler2D u_depth;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_hasDepth;

float depthAt(vec2 uv, float index) {
  vec2 grid = vec2(8.0, 6.0);
  vec2 tile = vec2(mod(index, grid.x), floor(index / grid.x));
  return texture2D(
    u_depth,
    (tile + clamp(uv, vec2(0.008), vec2(0.992))) / grid
  ).r;
}

void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  float screen = u_resolution.x / u_resolution.y;
  float image = 16.0 / 9.0;
  vec2 cover = vec2(min(1.0, screen/image), min(1.0, image/screen));
  uv = (uv - 0.5) * cover * 0.97 + 0.5;
  float frame = clamp((u_time - 0.25) * 2.0, 0.0, 47.0);
  float d = mix(
    depthAt(uv, floor(frame)),
    depthAt(uv, min(47.0, ceil(frame))),
    fract(frame)
  );
  uv += u_pointer * vec2(0.014, 0.011) * (d - 0.35) * u_hasDepth;
  gl_FragColor = texture2D(u_scene, clamp(uv, vec2(0.001), vec2(0.999)));
}
`;

export default function CinematicScene({
  progress,
  quality,
  manifest,
  onVideoFrameReady,
  onPosterLoaded,
  onBufferProgress,
  videoRefOut,
}: CinematicSceneProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const lastTargetTime = useRef(0);
  const isSeekingRef = useRef(false);

  // Pointer smoothing for WebGL parallax
  const pointerCurrent = useRef({ x: 0, y: 0 });
  const pointerTarget = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(performance.now());
  const hasDepthRef = useRef(0);

  // WebGL references
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const sceneTextureRef = useRef<WebGLTexture | null>(null);
  const depthTextureRef = useRef<WebGLTexture | null>(null);

  // Pick video source according to quality
  const isMobileViewport = typeof window !== 'undefined' && (window.innerWidth <= 900 || matchMedia('(pointer: coarse)').matches);
  const selectedVideoSrc =
    quality === '1080p'
      ? manifest.desktopVideo
      : quality === '720p'
      ? manifest.mobileVideo
      : isMobileViewport
      ? manifest.mobileVideo
      : manifest.desktopVideo;

  // Pass video ref out for live glass card blurs
  useEffect(() => {
    if (videoRefOut) {
      videoRefOut(videoRef.current);
    }
  }, [videoRefOut]);

  // Video seeking logic with 1/24s frame threshold
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.duration || isNaN(video.duration)) return;

    const duration = Math.max(0, video.duration - 0.045);
    const targetVideoTime = progress * duration;
    lastTargetTime.current = targetVideoTime;

    if (!isSeekingRef.current && Math.abs(video.currentTime - targetVideoTime) > 1 / 24) {
      isSeekingRef.current = true;
      video.currentTime = targetVideoTime;
    }
  }, [progress]);

  // Handle video seeked event
  const handleSeeked = useCallback(() => {
    isSeekingRef.current = false;
    const video = videoRef.current;
    if (!video || !video.duration) return;

    // If target has drifted further while seeking, seek again
    const diff = Math.abs(video.currentTime - lastTargetTime.current);
    if (diff > 1 / 24) {
      isSeekingRef.current = true;
      video.currentTime = lastTargetTime.current;
    }
  }, []);

  // Track pointer on fine-pointer devices
  useEffect(() => {
    const isFinePointer = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
    if (!isFinePointer) return;

    const handlePointerMove = (e: PointerEvent) => {
      pointerTarget.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };

    const handlePointerLeave = () => {
      pointerTarget.current = { x: 0, y: 0 };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  // Initialize WebGL Shaders & Textures
  useEffect(() => {
    const isFinePointer = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
    if (!isFinePointer) {
      setWebglSupported(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      setWebglSupported(false);
      return;
    }

    glRef.current = gl;

    // Compile shaders
    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) {
      setWebglSupported(false);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      setWebglSupported(false);
      return;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      setWebglSupported(false);
      return;
    }

    programRef.current = program;

    // Fullscreen quad
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    // Create scene texture
    const sceneTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    sceneTextureRef.current = sceneTex;

    // Load Depth Atlas Texture
    const depthImg = new Image();
    depthImg.crossOrigin = 'anonymous';
    depthImg.src = manifest.depthAtlas;
    depthImg.onload = () => {
      if (!glRef.current) return;
      const dTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, dTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, depthImg);
      depthTextureRef.current = dTex;
      hasDepthRef.current = 1.0;
    };
    depthImg.onerror = () => {
      hasDepthRef.current = 0.0;
    };

    // Render loop
    let animId: number;
    let lastRenderedTime = -1;

    const render = (now: number) => {
      const gl = glRef.current;
      const video = videoRef.current;
      const program = programRef.current;

      if (gl && program && canvas) {
        const dt = Math.min(50, now - lastTimeRef.current);
        lastTimeRef.current = now;

        // Smooth pointer
        const alpha = 1 - Math.pow(0.945, dt / 16.667);
        pointerCurrent.current.x += (pointerTarget.current.x - pointerCurrent.current.x) * alpha;
        pointerCurrent.current.y += (pointerTarget.current.y - pointerCurrent.current.y) * alpha;

        // Resize canvas to viewport, max DPR 1.5
        const dpr = Math.min(1.5, window.devicePixelRatio || 1);
        const displayW = Math.round(window.innerWidth * dpr);
        const displayH = Math.round(window.innerHeight * dpr);

        if (canvas.width !== displayW || canvas.height !== displayH) {
          canvas.width = displayW;
          canvas.height = displayH;
          gl.viewport(0, 0, displayW, displayH);
        }

        gl.useProgram(program);

        // Upload video texture when ready and changed
        if (video && video.readyState >= 2 && !video.seeking && sceneTextureRef.current) {
          if (video.currentTime !== lastRenderedTime) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, sceneTextureRef.current);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
            lastRenderedTime = video.currentTime;
          }
        }

        // Set uniforms
        gl.uniform1i(gl.getUniformLocation(program, 'u_scene'), 0);
        gl.uniform1i(gl.getUniformLocation(program, 'u_depth'), 1);
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), displayW, displayH);
        gl.uniform2f(
          gl.getUniformLocation(program, 'u_pointer'),
          pointerCurrent.current.x,
          pointerCurrent.current.y
        );
        gl.uniform1f(gl.getUniformLocation(program, 'u_time'), video?.currentTime || 0);
        gl.uniform1f(gl.getUniformLocation(program, 'u_hasDepth'), hasDepthRef.current);

        // Bind depth texture
        if (depthTextureRef.current) {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, depthTextureRef.current);
        }

        // Draw quad
        const aPos = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      if (gl) {
        if (sceneTextureRef.current) gl.deleteTexture(sceneTextureRef.current);
        if (depthTextureRef.current) gl.deleteTexture(depthTextureRef.current);
        if (program) gl.deleteProgram(program);
      }
    };
  }, [manifest.depthAtlas]);

  // Buffer progress check
  const handleProgress = useCallback(() => {
    const video = videoRef.current;
    if (video && video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(0);
      onBufferProgress(bufferedEnd);
    }
  }, [onBufferProgress]);

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden select-none">
      {/* 1. Initial Opening Poster (WebP) with cover fit */}
      <picture>
        <source media="(max-width: 900px)" srcSet={manifest.mobileOpeningPoster} />
        <img
          src={manifest.openingPoster}
          alt="Sanctuary within Stone slot canyon"
          onLoad={onPosterLoaded}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 pointer-events-none"
          style={{ transform: 'scale(1.031)' }}
        />
      </picture>

      {/* 2. Fullscreen WebGL Depth Parallax Canvas (fine pointer only) */}
      {webglSupported && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          style={{ opacity: 1 }}
        />
      )}

      {/* 3. Native Video Scrubber (used for WebGL texture upload & fallback) */}
      <video
        ref={videoRef}
        src={selectedVideoSrc}
        playsInline
        muted
        preload="auto"
        onLoadedData={onVideoFrameReady}
        onSeeked={handleSeeked}
        onProgress={handleProgress}
        className={`absolute inset-0 h-full w-full object-cover pointer-events-none transition-opacity duration-300 ${
          webglSupported ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ transform: 'scale(1.031)' }}
      />

      {/* 4. Exact Readability Vignette Gradient */}
      <div className="serra-gradient-overlay absolute inset-0 h-full w-full pointer-events-none" />
    </div>
  );
}
