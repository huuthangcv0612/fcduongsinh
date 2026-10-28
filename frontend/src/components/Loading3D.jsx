import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Procedurally generates a truncated icosahedron (classic 32-panel soccer ball)
 * with individual leather puff panels, physical recessed seams, and separate materials
 * for hexagons (pearl white) and pentagons (navy blue).
 */
function createSoccerBallMesh(radius = 1.0) {
  const group = new THREE.Group();
  const phi = (1 + Math.sqrt(5)) / 2;

  // 12 base vertices of an icosahedron
  const icoVerts = [
    new THREE.Vector3(-1, phi, 0).normalize(),
    new THREE.Vector3(1, phi, 0).normalize(),
    new THREE.Vector3(-1, -phi, 0).normalize(),
    new THREE.Vector3(1, -phi, 0).normalize(),
    new THREE.Vector3(0, -1, phi).normalize(),
    new THREE.Vector3(0, 1, phi).normalize(),
    new THREE.Vector3(0, -1, -phi).normalize(),
    new THREE.Vector3(0, 1, -phi).normalize(),
    new THREE.Vector3(phi, 0, -1).normalize(),
    new THREE.Vector3(phi, 0, 1).normalize(),
    new THREE.Vector3(-phi, 0, -1).normalize(),
    new THREE.Vector3(-phi, 0, 1).normalize()
  ];

  // 20 triangular faces of an icosahedron
  const icoFaces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  // 1. Inner dark core sphere (represents inner rubber bladder & recessed seam shadow)
  const coreGeo = new THREE.SphereGeometry(radius * 0.985, 32, 32);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f1d,
    roughness: 0.8,
    metalness: 0.1
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // Materials for panels
  const hexMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.32,
    metalness: 0.08,
    envMapIntensity: 1.2
  });

  const pentMat = new THREE.MeshStandardMaterial({
    color: 0x1e2b99, // FC Duong Sinh Royal Navy Blue
    roughness: 0.28,
    metalness: 0.15,
    envMapIntensity: 1.4
  });

  // Helper to build a curved panel geometry (puffed center + beveled perimeter)
  const buildPanelGeometry = (points) => {
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];

    // Calculate center of panel
    const center = new THREE.Vector3();
    points.forEach(p => center.add(p));
    center.divideScalar(points.length).normalize();

    // The center is slightly raised (puff effect)
    const puffedCenter = center.clone().multiplyScalar(radius * 1.022);

    // Scaled perimeter points towards center (creates physical recessed groove between panels)
    const seamScale = 0.945;
    const scaledPoints = points.map(p => {
      const v = new THREE.Vector3().lerpVectors(center, p, seamScale).normalize();
      return v.multiplyScalar(radius * 1.008);
    });

    // Triangle fan from puffed center to each edge segment
    const n = scaledPoints.length;
    for (let i = 0; i < n; i++) {
      const pCurrent = scaledPoints[i];
      const pNext = scaledPoints[(i + 1) % n];

      // Triangle: (puffedCenter, pCurrent, pNext)
      positions.push(puffedCenter.x, puffedCenter.y, puffedCenter.z);
      positions.push(pCurrent.x, pCurrent.y, pCurrent.z);
      positions.push(pNext.x, pNext.y, pNext.z);

      // Vertex normals pointing outward from center
      const nCenter = puffedCenter.clone().normalize();
      const nCurrent = pCurrent.clone().normalize();
      const nNext = pNext.clone().normalize();

      normals.push(nCenter.x, nCenter.y, nCenter.z);
      normals.push(nCurrent.x, nCurrent.y, nCurrent.z);
      normals.push(nNext.x, nNext.y, nNext.z);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geo;
  };

  // 2. Generate 20 Hexagon Panels (from the 20 truncated icosahedron faces)
  icoFaces.forEach(f => {
    const v0 = icoVerts[f[0]];
    const v1 = icoVerts[f[1]];
    const v2 = icoVerts[f[2]];

    const p0 = new THREE.Vector3().lerpVectors(v0, v1, 1 / 3).normalize();
    const p1 = new THREE.Vector3().lerpVectors(v0, v1, 2 / 3).normalize();
    const p2 = new THREE.Vector3().lerpVectors(v1, v2, 1 / 3).normalize();
    const p3 = new THREE.Vector3().lerpVectors(v1, v2, 2 / 3).normalize();
    const p4 = new THREE.Vector3().lerpVectors(v2, v0, 1 / 3).normalize();
    const p5 = new THREE.Vector3().lerpVectors(v2, v0, 2 / 3).normalize();

    const hexGeo = buildPanelGeometry([p0, p1, p2, p3, p4, p5]);
    const hexMesh = new THREE.Mesh(hexGeo, hexMat);
    group.add(hexMesh);
  });

  // 3. Generate 12 Pentagon Panels (around the 12 truncated icosahedron vertices)
  for (let i = 0; i < 12; i++) {
    const v = icoVerts[i];
    const adj = new Set();
    icoFaces.forEach(f => {
      const idx = f.indexOf(i);
      if (idx !== -1) {
        adj.add(f[(idx + 1) % 3]);
        adj.add(f[(idx + 2) % 3]);
      }
    });
    const adjArr = Array.from(adj);
    const pts = adjArr.map(nIdx => new THREE.Vector3().lerpVectors(v, icoVerts[nIdx], 1 / 3).normalize());

    // Sort cyclically around normal v
    const u = new THREE.Vector3().crossVectors(v, pts[0]).normalize();
    const w = new THREE.Vector3().crossVectors(v, u).normalize();
    pts.sort((a, b) => {
      const angleA = Math.atan2(a.dot(w), a.dot(u));
      const angleB = Math.atan2(b.dot(w), b.dot(u));
      return angleA - angleB;
    });

    const pentGeo = buildPanelGeometry(pts);
    const pentMesh = new THREE.Mesh(pentGeo, pentMat);
    group.add(pentMesh);
  }

  return group;
}

/**
 * Creates soft procedural contact drop shadow canvas
 */
function createShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
  gradient.addColorStop(0, 'rgba(15, 23, 42, 0.65)');
  gradient.addColorStop(0.3, 'rgba(30, 41, 59, 0.45)');
  gradient.addColorStop(0.65, 'rgba(30, 58, 138, 0.18)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Loading3D - High performance, responsive 3D loading component
 * Built following the 3Dviz Pro Max methodology
 */
export default function Loading3D({
  variant = 'fullscreen', // 'fullscreen' | 'section' | 'card' | 'inline'
  text,
  subtext,
  size
}) {
  const mountRef = useRef(null);
  const [webglFailed, setWebglFailed] = useState(false);

  // Compute container dimensions depending on variant
  const dims = useMemo(() => {
    if (size) return { width: size, height: size };
    switch (variant) {
      case 'inline':
        return { width: 72, height: 72 };
      case 'card':
        return { width: 140, height: 140 };
      case 'section':
        return { width: 220, height: 200 };
      case 'fullscreen':
      default:
        return { width: 260, height: 260 };
    }
  }, [variant, size]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglFailed(true);
        return;
      }
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = container.clientWidth || dims.width;
    const height = container.clientHeight || dims.height;

    // 1. Three.js Scene & Camera setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.3, 4.2);

    // 2. WebGL Renderer with devicePixelRatio clamped to 2 (mobile battery efficiency)
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 3. Lighting Rig (Key Light + Fill Light + Rim Light + Ambient)
    const ambientLight = new THREE.AmbientLight(0xe2e8f0, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x3b82f6, 1.0);
    fillLight.position.set(-5, -2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.6);
    rimLight.position.set(0, 5, -5);
    scene.add(rimLight);

    // 4. Hero Object: 3D Soccer Ball
    const ballRadius = 1.0;
    const soccerBall = createSoccerBallMesh(ballRadius);
    // Apply initial aerodynamic spin tilt (23.5 degrees)
    soccerBall.rotation.z = THREE.MathUtils.degToRad(18);
    soccerBall.rotation.x = THREE.MathUtils.degToRad(12);
    scene.add(soccerBall);

    // 5. Dynamic Ground Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowTex = createShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.45;
    scene.add(shadowMesh);

    // 6. Tactical Gyroscopic Orbit Rings
    const ringGroup = new THREE.Group();

    // Ring 1: Club Gold Tactical Ring
    const ring1Geo = new THREE.TorusGeometry(1.42, 0.015, 12, 64);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.9,
      transparent: true,
      opacity: 0.75
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    ringGroup.add(ring1);

    // Ring 2: Emerald Green Tactical Ring
    const ring2Geo = new THREE.TorusGeometry(1.6, 0.012, 12, 64);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.6
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 6;
    ringGroup.add(ring2);

    scene.add(ringGroup);

    // 7. Stadium Energy Dust Particles
    const particleCount = 28;
    const particleGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    const pOriginalY = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radiusP = 1.3 + Math.random() * 1.2;
      const angle = Math.random() * Math.PI * 2;
      pPositions[i * 3] = Math.cos(angle) * radiusP;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 2.5;
      pPositions[i * 3 + 2] = Math.sin(angle) * radiusP;
      pOriginalY[i] = pPositions[i * 3 + 1];
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 8. Animation Loop with physical grounding
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Fluid soccer ball spin along its tilted axis
      soccerBall.rotation.y += 0.016;

      // Gentle floating bobbing motion
      const floatY = Math.sin(elapsed * 2.8) * 0.12;
      soccerBall.position.y = floatY;

      // Synchronized physical contact shadow: shrinks and fades when ball rises
      const shadowFactor = 1 - (floatY + 0.12) / 0.24 * 0.35;
      shadowMesh.scale.set(shadowFactor, shadowFactor, 1);
      shadowMat.opacity = 0.55 * shadowFactor;

      // Orbiting tactical rings
      ring1.rotation.z += 0.012;
      ring2.rotation.z -= 0.009;
      ringGroup.position.y = floatY * 0.5;

      // Floating dust particles drifting upwards
      const posAttr = particleGeo.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        pPositions[i * 3 + 1] += 0.004;
        if (pPositions[i * 3 + 1] > 1.8) {
          pPositions[i * 3 + 1] = -1.4;
        }
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Responsive Resize Handler via ResizeObserver
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 10. Memory Lifecycle Cleanup (3Dviz Pro Max rule)
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      // Dispose geometries, materials, textures
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      if (shadowTex) shadowTex.dispose();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, [dims]);

  // CSS 3D Fallback if WebGL is disabled or failed
  if (webglFailed) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 ${variant === 'fullscreen' ? 'min-h-[60vh]' : ''}`}>
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-amber-400 animate-spin flex items-center justify-center shadow-lg shadow-blue-500/20">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-xl">
            ⚽
          </div>
        </div>
        {text && <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide">{text}</p>}
      </div>
    );
  }

  // Render container based on variant
  if (variant === 'fullscreen') {
    return (
      <div className="min-h-[75vh] w-full flex flex-col items-center justify-center px-4 py-8 animate-fade-in select-none">
        {/* Glowing backdrop aura */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-64 h-64 sm:w-80 sm:h-80 bg-gradient-to-tr from-blue-600/20 via-indigo-500/15 to-amber-400/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />

          <div
            ref={mountRef}
            className="cursor-pointer transition-transform active:scale-95 duration-200"
            style={{ width: dims.width, height: dims.height }}
            title="FC Dưỡng Sinh"
          />
        </div>

        {/* Text and status info */}
        <div className="text-center mt-2 space-y-1.5 max-w-xs sm:max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>FC DƯỠNG SINH</span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {text || 'Đang tải dữ liệu...'}
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {subtext || 'Chiến thuật • Đoàn kết • Đam mê'}
          </p>

          {/* Animated loading pulse bar */}
          <div className="pt-2 w-36 mx-auto">
            <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 via-amber-400 to-emerald-500 rounded-full animate-pulse w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'section' || variant === 'card') {
    return (
      <div className="flex flex-col items-center justify-center p-6 w-full animate-fade-in select-none">
        <div
          ref={mountRef}
          style={{ width: dims.width, height: dims.height }}
          className="relative"
        />
        {text && (
          <p className="mt-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 tracking-wide text-center">
            {text}
          </p>
        )}
        {subtext && (
          <p className="text-[11px] text-slate-600 dark:text-slate-400 text-center mt-0.5">
            {subtext}
          </p>
        )}
      </div>
    );
  }

  // variant === 'inline'
  return (
    <div className="inline-flex flex-col items-center justify-center">
      <div
        ref={mountRef}
        style={{ width: dims.width, height: dims.height }}
      />
      {text && (
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          {text}
        </span>
      )}
    </div>
  );
}
