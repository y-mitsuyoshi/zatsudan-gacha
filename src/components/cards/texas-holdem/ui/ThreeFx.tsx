'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface ThreeFxProps {
  /** increment to fire a new burst (0 = idle) */
  burstKey: number;
  /** disabled when reduced effects are requested */
  disabled?: boolean;
  durationMs?: number;
}

/**
 * Transparent full-screen three.js layer: gold coins + sparkles burst with gravity & spin.
 * three is loaded lazily (dynamic import) so it stays out of the main bundle and SSR.
 */
export function ThreeFx({ burstKey, disabled = false, durationMs = 3200 }: ThreeFxProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [doneKey, setDoneKey] = useState(0);
  const active = burstKey > 0 && doneKey !== burstKey && !disabled;

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    void import('three').then((THREE) => {
      if (disposed) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      } catch {
        setDoneKey(burstKey);
        return;
      }
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h, false);
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
      camera.position.set(0, 0, 14);

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dir = new THREE.DirectionalLight(0xfff1c1, 2.2);
      dir.position.set(3, 5, 8);
      scene.add(dir);
      const rim = new THREE.PointLight(0xffd36b, 30, 40);
      rim.position.set(-4, -2, 6);
      scene.add(rim);

      // coins
      const COINS = w < 640 ? 110 : 200;
      const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.06, 24);
      coinGeo.rotateX(Math.PI / 2);
      const coinMat = new THREE.MeshStandardMaterial({ color: 0xf5c542, metalness: 0.95, roughness: 0.25, emissive: 0x3a2500 });
      const coins = new THREE.InstancedMesh(coinGeo, coinMat, COINS);
      scene.add(coins);
      const pos = new Float32Array(COINS * 3);
      const vel = new Float32Array(COINS * 3);
      const rot = new Float32Array(COINS * 3);
      const spin = new Float32Array(COINS * 3);
      for (let i = 0; i < COINS; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 2;
        pos[i * 3 + 1] = -6 - Math.random() * 1.5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
        const ang = (Math.random() - 0.5) * 1.3;
        const sp = 11 + Math.random() * 8;
        vel[i * 3] = Math.sin(ang) * sp;
        vel[i * 3 + 1] = Math.cos(ang) * sp;
        vel[i * 3 + 2] = (Math.random() - 0.5) * 4;
        for (let k = 0; k < 3; k++) {
          rot[i * 3 + k] = Math.random() * Math.PI * 2;
          spin[i * 3 + k] = (Math.random() - 0.5) * 14;
        }
      }

      // sparkles
      const SP = w < 640 ? 220 : 380;
      const spGeo = new THREE.BufferGeometry();
      const spPos = new Float32Array(SP * 3);
      const spVel = new Float32Array(SP * 3);
      for (let i = 0; i < SP; i++) {
        spPos[i * 3] = (Math.random() - 0.5) * 1.5;
        spPos[i * 3 + 1] = -1 + (Math.random() - 0.5) * 1.5;
        spPos[i * 3 + 2] = (Math.random() - 0.5) * 2;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.random() * Math.PI;
        const s = 4 + Math.random() * 9;
        spVel[i * 3] = Math.cos(th) * Math.sin(ph) * s;
        spVel[i * 3 + 1] = Math.sin(th) * Math.sin(ph) * s + 2;
        spVel[i * 3 + 2] = Math.cos(ph) * s * 0.4;
      }
      spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
      const tex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d');
        if (g) {
          const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
          grad.addColorStop(0, 'rgba(255,255,240,1)');
          grad.addColorStop(0.25, 'rgba(255,220,120,0.9)');
          grad.addColorStop(1, 'rgba(255,180,0,0)');
          g.fillStyle = grad;
          g.fillRect(0, 0, 64, 64);
        }
        return new THREE.CanvasTexture(c);
      })();
      const spMat = new THREE.PointsMaterial({
        size: 0.35,
        map: tex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 0xffe08a,
      });
      const sparks = new THREE.Points(spGeo, spMat);
      scene.add(sparks);

      const dummy = new THREE.Object3D();
      const start = performance.now();
      let last = start;
      const G = -16;
      const tick = (now: number) => {
        if (disposed) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const t = (now - start) / durationMs;
        for (let i = 0; i < COINS; i++) {
          vel[i * 3 + 1] += G * dt;
          for (let k = 0; k < 3; k++) {
            pos[i * 3 + k] += vel[i * 3 + k] * dt;
            rot[i * 3 + k] += spin[i * 3 + k] * dt;
          }
          dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
          dummy.rotation.set(rot[i * 3], rot[i * 3 + 1], rot[i * 3 + 2]);
          dummy.updateMatrix();
          coins.setMatrixAt(i, dummy.matrix);
        }
        coins.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < SP; i++) {
          spVel[i * 3 + 1] += G * 0.25 * dt;
          for (let k = 0; k < 3; k++) {
            spVel[i * 3 + k] *= 0.985;
            spPos[i * 3 + k] += spVel[i * 3 + k] * dt;
          }
        }
        spGeo.attributes.position.needsUpdate = true;
        spMat.opacity = Math.max(0, 1 - Math.max(0, t - 0.55) / 0.45);
        coinMat.opacity = spMat.opacity;
        coinMat.transparent = t > 0.6;
        renderer.render(scene, camera);
        if (t >= 1) {
          setDoneKey(burstKey);
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        coinGeo.dispose();
        coinMat.dispose();
        coins.dispose();
        spGeo.dispose();
        spMat.dispose();
        tex.dispose();
        renderer.dispose();
      };
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [active, burstKey, durationMs]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[85] h-full w-full"
    />
  );
}

export default ThreeFx;
