import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const RobotHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || 650;

    // ─────────────────────────────────────────────────────────────
    // 1. Scene & Camera Setup
    // ─────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.38, 3.9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // ─────────────────────────────────────────────────────────────
    // 2. High-End Studio Lighting Rig
    // ─────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xf5f6fa, 1.1);
    scene.add(ambientLight);

    // Key Light (warm studio spotlight from top-right)
    const keyLight = new THREE.DirectionalLight(0xfff5eb, 2.2);
    keyLight.position.set(3, 4.5, 3.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0008;
    scene.add(keyLight);

    // Fill Light (soft cool light from left)
    const fillLight = new THREE.DirectionalLight(0xdbe4ee, 1.2);
    fillLight.position.set(-3.5, 2.5, 2.5);
    scene.add(fillLight);

    // Top Rim Light (defines silhouette)
    const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
    rimLight.position.set(0, 4, -3);
    scene.add(rimLight);

    // Bottom Bounce Light (soft bounce on underside of chin)
    const bounceLight = new THREE.DirectionalLight(0xb0b5c0, 0.6);
    bounceLight.position.set(0, -3, 2);
    scene.add(bounceLight);

    // Master Character Group
    const characterGroup = new THREE.Group();
    characterGroup.position.set(0, -0.68, 0);
    scene.add(characterGroup);

    // ─────────────────────────────────────────────────────────────
    // 3. Humanoid Body with Ribbed Turtleneck Sweater
    // ─────────────────────────────────────────────────────────────
    const turtleneckMat = new THREE.MeshStandardMaterial({
      color: 0x989ba3,
      roughness: 0.9,
      metalness: 0.04,
    });

    // Torso / Shoulders with natural anatomical slope
    const torsoGeo = new THREE.CylinderGeometry(0.72, 0.98, 1.35, 48);
    torsoGeo.scale(1.4, 1, 0.78);
    const torsoMesh = new THREE.Mesh(torsoGeo, turtleneckMat);
    torsoMesh.position.set(0, -0.68, 0);
    torsoMesh.receiveShadow = true;
    torsoMesh.castShadow = true;
    characterGroup.add(torsoMesh);

    // Ribbed Turtleneck Collar (tall folded neck)
    const collarGroup = new THREE.Group();
    collarGroup.position.set(0, 0.15, 0);
    characterGroup.add(collarGroup);

    const neckCollarGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.48, 36);
    const neckCollarMesh = new THREE.Mesh(neckCollarGeo, turtleneckMat);
    neckCollarMesh.castShadow = true;
    collarGroup.add(neckCollarMesh);

    // Ribbed knit ring bands
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.TorusGeometry(0.355 + i * 0.005, 0.035, 12, 36);
      ringGeo.rotateX(Math.PI / 2);
      const ringMesh = new THREE.Mesh(ringGeo, turtleneckMat);
      ringMesh.position.set(0, -0.15 + i * 0.1, 0);
      collarGroup.add(ringMesh);
    }

    // Top Collar Fold Overhang
    const foldGeo = new THREE.TorusGeometry(0.37, 0.065, 16, 40);
    foldGeo.rotateX(Math.PI / 2);
    const foldMesh = new THREE.Mesh(foldGeo, turtleneckMat);
    foldMesh.position.set(0, 0.22, 0);
    collarGroup.add(foldMesh);

    // Articulated Biomechanical Neck Cylinder
    const neckInnerMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e24,
      roughness: 0.25,
      metalness: 0.85,
    });
    const neckInnerGeo = new THREE.CylinderGeometry(0.18, 0.21, 0.32, 28);
    const neckInnerMesh = new THREE.Mesh(neckInnerGeo, neckInnerMat);
    neckInnerMesh.position.set(0, 0.36, 0);
    characterGroup.add(neckInnerMesh);

    // ─────────────────────────────────────────────────────────────
    // 4. Vintage Modern CRT Monitor Head Assembly
    // ─────────────────────────────────────────────────────────────
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.78, 0);
    characterGroup.add(headGroup);

    // Monitor Outer Casing (Rounded Chamfer Box)
    const monitorMat = new THREE.MeshStandardMaterial({
      color: 0x25272e,
      roughness: 0.38,
      metalness: 0.35,
    });

    const casingGeo = new THREE.BoxGeometry(1.28, 1.12, 1.02, 6, 6, 6);
    const casingMesh = new THREE.Mesh(casingGeo, monitorMat);
    casingMesh.castShadow = true;
    casingMesh.receiveShadow = true;
    headGroup.add(casingMesh);

    // Front Silver Bezel Accent Frame (Locomotive Lisa signature border)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x6e727c,
      roughness: 0.25,
      metalness: 0.8,
    });
    const frameGeo = new THREE.BoxGeometry(1.22, 1.06, 0.08);
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(0, 0.01, 0.49);
    headGroup.add(frameMesh);

    // Inset Front Screen Bezel (Dark Matte Charcoal)
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x14151a,
      roughness: 0.55,
      metalness: 0.2,
    });
    const bezelGeo = new THREE.BoxGeometry(1.14, 0.98, 0.06);
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.set(0, 0.02, 0.52);
    headGroup.add(bezelMesh);

    // Convex CRT Glass Screen (Deep glossy glass with specular reflection)
    const screenMat = new THREE.MeshPhysicalMaterial({
      color: 0x08090d,
      roughness: 0.1,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const screenGeo = new THREE.BoxGeometry(0.96, 0.78, 0.04);
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.06, 0.55);
    headGroup.add(screenMesh);

    // Lower Front Panel Controls (Row of round vent / LED dots)
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x5a5d68,
      roughness: 0.3,
      metalness: 0.7,
    });
    for (let i = 0; i < 6; i++) {
      const dotGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.02, 16);
      dotGeo.rotateX(Math.PI / 2);
      const dotMesh = new THREE.Mesh(dotGeo, ledMat);
      dotMesh.position.set(0.12 + i * 0.05, -0.38, 0.55);
      headGroup.add(dotMesh);
    }

    // Rotary dial knob on left of control panel
    const dialMat = new THREE.MeshStandardMaterial({
      color: 0x3d4048,
      roughness: 0.2,
      metalness: 0.9,
    });
    const dialGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.035, 20);
    dialGeo.rotateX(Math.PI / 2);
    const dialMesh = new THREE.Mesh(dialGeo, dialMat);
    dialMesh.position.set(-0.35, -0.38, 0.55);
    headGroup.add(dialMesh);

    // ─────────────────────────────────────────────────────────────
    // 5. Signature Glowing Phosphor CRT Eyes (LISA Style)
    // ─────────────────────────────────────────────────────────────
    const eyesGroup = new THREE.Group();
    eyesGroup.position.set(0, 0.08, 0.58);
    headGroup.add(eyesGroup);

    // Custom Canvas Texture with bright round phosphor glow & scanlines
    const createEyeTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Glowing circular core with soft diffuse halo
      const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 118);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.25, 'rgba(255, 250, 235, 0.98)');
      grad.addColorStop(0.55, 'rgba(240, 225, 200, 0.65)');
      grad.addColorStop(0.85, 'rgba(220, 200, 175, 0.2)');
      grad.addColorStop(1, 'rgba(200, 180, 150, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(128, 128, 118, 0, Math.PI * 2);
      ctx.fill();

      // CRT Scanline raster effect
      ctx.fillStyle = 'rgba(10, 12, 16, 0.18)';
      for (let y = 0; y < 256; y += 5) {
        ctx.fillRect(0, y, 256, 2);
      }

      // Subtle phosphor mesh texture
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      for (let x = 0; x < 256; x += 6) {
        ctx.fillRect(x, 0, 2, 256);
      }

      const tex = new THREE.CanvasTexture(canvas);
      return tex;
    };

    const eyeTexture = createEyeTexture();
    const eyeMat = new THREE.MeshBasicMaterial({
      map: eyeTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const eyeGeo = new THREE.PlaneGeometry(0.3, 0.3);

    // Left Eye
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.22, 0, 0);
    eyesGroup.add(leftEye);

    // Right Eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.22, 0, 0);
    eyesGroup.add(rightEye);

    // Soft Point Light emitted from eyes onto face frame
    const screenGlowLight = new THREE.PointLight(0xfff0dd, 1.6, 1.8);
    screenGlowLight.position.set(0, 0.1, 0.85);
    headGroup.add(screenGlowLight);

    // ─────────────────────────────────────────────────────────────
    // 6. Side Audio Jacks & Dangling Patch Cables
    // ─────────────────────────────────────────────────────────────
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x111216,
      roughness: 0.85,
      metalness: 0.1,
    });

    const jackMat = new THREE.MeshStandardMaterial({
      color: 0x858994,
      roughness: 0.2,
      metalness: 0.9,
    });

    const createJack = (x: number, y: number, z: number, rotY: number) => {
      const jackGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.05, 16);
      jackGeo.rotateZ(Math.PI / 2);
      const jackMesh = new THREE.Mesh(jackGeo, jackMat);
      jackMesh.position.set(x, y, z);
      jackMesh.rotation.y = rotY;
      headGroup.add(jackMesh);
    };

    // Jack sockets on left and right monitor walls
    createJack(-0.64, -0.22, 0.2, 0);
    createJack(-0.64, -0.34, 0.28, 0);
    createJack(0.64, -0.22, 0.2, 0);
    createJack(0.64, -0.34, 0.28, 0);

    // Bottom jacks
    createJack(-0.25, -0.56, 0.2, Math.PI / 2);
    createJack(0.25, -0.56, 0.2, Math.PI / 2);

    const createCable = (
      p1: [number, number, number],
      p2: [number, number, number],
      droop: number
    ) => {
      const start = new THREE.Vector3(...p1);
      const end = new THREE.Vector3(...p2);
      const mid = new THREE.Vector3(
        (start.x + end.x) * 0.5 + (Math.random() - 0.5) * 0.06,
        (start.y + end.y) * 0.5 - droop,
        (start.z + end.z) * 0.5 + 0.08
      );

      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.013, 8, false);
      return new THREE.Mesh(tubeGeo, cableMat);
    };

    // Left cables drooping into sweater
    headGroup.add(createCable([-0.65, -0.22, 0.2], [-0.32, -0.72, 0.18], 0.22));
    headGroup.add(createCable([-0.65, -0.34, 0.28], [-0.22, -0.74, 0.26], 0.18));

    // Right cables drooping into sweater
    headGroup.add(createCable([0.65, -0.22, 0.2], [0.32, -0.72, 0.18], 0.22));
    headGroup.add(createCable([0.65, -0.34, 0.28], [0.22, -0.74, 0.26], 0.18));

    // Bottom cables
    headGroup.add(createCable([-0.25, -0.56, 0.2], [-0.12, -0.78, 0.22], 0.14));
    headGroup.add(createCable([0.25, -0.56, 0.2], [0.12, -0.78, 0.22], 0.14));

    // ─────────────────────────────────────────────────────────────
    // 7. Interactive Cursor Tracking (Smooth Lerp + Gaze)
    // ─────────────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      mouse.x = (clientX / rect.width) * 2 - 1;
      mouse.y = -(clientY / rect.height) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // ─────────────────────────────────────────────────────────────
    // 8. Animation Loop (Breathing + Blinking + Inertia Tilt)
    // ─────────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let blinkTimer = 0;
    let isBlinking = false;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth interpolation towards mouse position
      target.x += (mouse.x - target.x) * 0.075;
      target.y += (mouse.y - target.y) * 0.075;

      // Head tilts and turns smoothly
      headGroup.rotation.y = target.x * 0.68;
      headGroup.rotation.x = -target.y * 0.38 + 0.04;
      headGroup.rotation.z = -target.x * 0.1;

      // Eyes look further towards the cursor (gaze tracking)
      eyesGroup.position.x = target.x * 0.08;
      eyesGroup.position.y = 0.08 + target.y * 0.05;

      // Natural breathing displacement on torso & collar
      const breath = Math.sin(elapsed * 1.6) * 0.016;
      characterGroup.position.y = -0.68 + breath;
      torsoMesh.scale.x = 1.4 + breath * 0.15;

      // Natural eye blinking
      blinkTimer += delta;
      if (!isBlinking && blinkTimer > 4.0 + Math.random() * 2.5) {
        isBlinking = true;
        blinkTimer = 0;
      }

      if (isBlinking) {
        eyesGroup.scale.y = Math.max(0.06, eyesGroup.scale.y - delta * 14);
        if (eyesGroup.scale.y <= 0.08) {
          isBlinking = false;
        }
      } else {
        eyesGroup.scale.y = Math.min(1.0, eyesGroup.scale.y + delta * 12);
      }

      renderer.render(scene, camera);
    };

    animate();

    // ─────────────────────────────────────────────────────────────
    // 9. Resize Handling
    // ─────────────────────────────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'crosshair',
      }}
    />
  );
};
