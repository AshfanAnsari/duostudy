import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ── Vengeance UI Wave Grid — real Three.js instanced cubes, standing front-facing ─
export function WaveGrid() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.userSelect = 'none';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    // Front-facing field (stands on glass in XY plane, displaces toward Z)
    camera.position.set(0, 0, 12.2);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(-4, 8, 5);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xe5487c, 0.25);
    rim.position.set(6, 3, 4);
    scene.add(rim);

    // Coverage passes: 72 columns x 28 rows
    const COLS = 72,
      ROWS = 28,
      N = COLS * ROWS,
      SP = 0.34;
    const geo = new THREE.BoxGeometry(0.332, 0.332, 0.332);
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.42,
      metalness: 0.05,
      transparent: true,
      opacity: 0.38,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, N);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);

    const base = new THREE.Color(0x8f6bd2),
      hi = new THREE.Color(0xf5efff),
      warm = new THREE.Color(0xe8846f);
    const dummy = new THREE.Object3D(),
      col = new THREE.Color();
    const offs: [number, number][] = [];
    for (let i = 0; i < COLS; i++) {
      for (let j = 0; j < ROWS; j++) {
        offs.push([(i - (COLS - 1) / 2) * SP, (j - (ROWS - 1) / 2) * SP]);
      }
    }

    const ripples: { x: number; y: number; t0: number }[] = [];
    let last = 0;
    let targetCamX = 0;
    let targetCamY = 0;
    const host = mount.parentElement as HTMLElement;
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const normX = (e.clientX - r.left) / r.width;
      const normY = (e.clientY - r.top) / r.height;
      targetCamX = (normX - 0.5) * 1.8;
      targetCamY = (0.5 - normY) * 1.4;

      const now = performance.now();
      if (now - last < 100) return;
      last = now;
      ripples.push({
        x: (normX - 0.5) * COLS * SP,
        y: (0.5 - normY) * ROWS * SP,
        t0: now,
      });
      if (ripples.length > 7) ripples.shift();
    };
    window.addEventListener('pointermove', move);

    const idle = window.setInterval(() => {
      ripples.push({
        x: (Math.random() - 0.5) * COLS * SP * 0.7,
        y: (Math.random() - 0.5) * ROWS * SP * 0.7,
        t0: performance.now(),
      });
      if (ripples.length > 6) ripples.shift();
    }, 3400);

    const resize = () => {
      const w = host.clientWidth,
        h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    const clock = new THREE.Clock();
    let raf = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tick = () => {
      const t = clock.getElapsedTime();
      if (!reduced) {
        camera.position.x += (targetCamX - camera.position.x) * 0.04;
        camera.position.y += (targetCamY - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);
      }

      let k = 0;
      for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
          const [x, y] = offs[k];
          let z = 0;
          if (!reduced) {
            z += Math.sin(x * 0.45 + t * 1.2) * Math.cos(y * 0.45 + t * 0.8) * 0.35;
            for (const rip of ripples) {
              const dt = (performance.now() - rip.t0) * 0.001;
              if (dt > 0 && dt < 4) {
                const dist = Math.hypot(x - rip.x, y - rip.y);
                const w = Math.sin(dist * 3.2 - dt * 5.0) * Math.exp(-dist * 0.4) * Math.exp(-dt * 0.85);
                z += w * 0.6;
              }
            }
          }
          dummy.position.set(x, y, z);
          dummy.rotation.x = z * 0.2;
          dummy.rotation.y = z * 0.15;
          dummy.updateMatrix();
          mesh.setMatrixAt(k, dummy.matrix);

          const factor = Math.min(1, Math.max(0, (z + 0.4) * 0.9));
          col.copy(base).lerp(warm, factor * 0.6).lerp(hi, factor * 0.4);
          mesh.setColorAt(k, col);
          k++;
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(idle);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geo.dispose();
      mat.dispose();
    };
  }, []);

  return <div ref={ref} className="absolute inset-0 pointer-events-none" />;
}
