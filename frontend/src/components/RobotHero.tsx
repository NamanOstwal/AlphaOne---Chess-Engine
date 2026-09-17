import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const RobotHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || 600;

    // Scene & Camera
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 3.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    // Key Light (warm studio spotlight from top-right)
    const keyLight = new THREE.DirectionalLight(0xfff6ec, 1.8);
    keyLight.position.set(2.5, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // Fill Light (cool soft light from left)
    const fillLight = new THREE.DirectionalLight(0xdde5ed, 1.1);
    fillLight.position.set(-3, 2, 2.5);
    scene.add(fillLight);

    // Rim / Backlight (creates crisp silhouette separation)
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // Master Group
    const characterGroup = new THREE.Group();
    characterGroup.position.set(0, -0.65, 0);
    scene.add(characterGroup);

    // ─────────────────────────────────────────────────────────────
    // 1. Humanoid Body with Ribbed Turtleneck Sweater
    // ─────────────────────────────────────────────────────────────
    const turtleneckMat = new THREE.MeshStandardMaterial({
      color: 0x9fa1a8,
      roughness: 0.88,
      metalness: 0.05,
    });

    // Shoulders / Torso
    const torsoGeo = new THREE.CylinderGeometry(0.7, 0.92, 1.3, 36);
    torsoGeo.scale(1.35, 1, 0.75);
    const torsoMesh = new THREE.Mesh(torsoGeo, turtleneckMat);
    torsoMesh.position.set(0, -0.65, 0);
    torsoMesh.receiveShadow = true;
    characterGroup.add(torsoMesh);

    // Turtleneck Collar (ribbed high-neck cylinder)
    const neckCollarGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.45, 32);
    const neckCollarMesh = new THREE.Mesh(neckCollarGeo, turtleneckMat);
    neckCollarMesh.position.set(0, 0.12, 0);
    neckCollarMesh.castShadow = true;
    characterGroup.add(neckCollarMesh);

    // Turtleneck fold rim
    const collarRimGeo = new THREE.TorusGeometry(0.36, 0.06, 16, 36);
    collarRimGeo.rotateX(Math.PI / 2);
    const collarRimMesh = new THREE.Mesh(collarRimGeo, turtleneckMat);
    collarRimMesh.position.set(0, 0.3, 0);
    characterGroup.add(collarRimMesh);

    // Biomechanical Neck joint
    const neckInnerMat = new THREE.MeshStandardMaterial({
      color: 0x22242a,
      roughness: 0.4,
      metalness: 0.7,
    });
    const neckInnerGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.25, 24);
    const neckInnerMesh = new THREE.Mesh(neckInnerGeo, neckInnerMat);
    neckInnerMesh.position.set(0, 0.35, 0);
    characterGroup.add(neckInnerMesh);

    // ─────────────────────────────────────────────────────────────
    // 2. Head Pivot & Vintage CRT Monitor Head
    // ─────────────────────────────────────────────────────────────
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.75, 0);
    characterGroup.add(headGroup);

    // Monitor Outer Casing (Rounded Chamfer Box)
    const monitorMat = new THREE.MeshStandardMaterial({
      color: 0x2a2d34,
      roughness: 0.42,
      metalness: 0.35,
    });

    const casingGeo = new THREE.BoxGeometry(1.2, 1.05, 0.95, 4, 4, 4);
    const casingMesh = new THREE.Mesh(casingGeo, monitorMat);
    casingMesh.castShadow = true;
    casingMesh.receiveShadow = true;
    headGroup.add(casingMesh);

    // Front Bezel Frame
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c22,
      roughness: 0.6,
      metalness: 0.4,
    });
    const bezelGeo = new THREE.BoxGeometry(1.1, 0.95, 0.1);
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.set(0, 0.02, 0.46);
    headGroup.add(bezelMesh);

    // CRT Screen Glass (Convex curved dark glass)
    const screenMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a0c10,
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
    });
    const screenGeo = new THREE.BoxGeometry(0.92, 0.76, 0.05);
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.05, 0.5);
    headGroup.add(screenMesh);

    // Front Control Dials / Knobs
    const knobMat = new THREE.MeshStandardMaterial({
      color: 0x484b55,
      roughness: 0.3,
      metalness: 0.8,
    });
    for (let i = 0; i < 4; i++) {
      const knobGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 16);
      knobGeo.rotateX(Math.PI / 2);
      const knobMesh = new THREE.Mesh(knobGeo, knobMat);
      knobMesh.position.set(0.2 + i * 0.07, -0.38, 0.5);
      headGroup.add(knobMesh);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Glowing Phosphor CRT Eyes (Matching LISA / Locomotive reference)
    // ─────────────────────────────────────────────────────────────
    const eyesGroup = new THREE.Group();
    eyesGroup.position.set(0, 0.07, 0.53);
    headGroup.add(eyesGroup);

    // Custom Canvas Texture with bright round phosphor glow & scanlines
    const createEyeTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      // Outer halo
      const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(245, 240, 230, 0.95)');
      grad.addColorStop(0.65, 'rgba(230, 220, 200, 0.45)');
      grad.addColorStop(1, 'rgba(200, 190, 180, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.fill();

      // Scanline overlay pattern
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < 128; y += 4) {
        ctx.fillRect(0, y, 128, 2);
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

    const eyeGeo = new THREE.PlaneGeometry(0.24, 0.24);

    // Left Eye
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.2, 0, 0);
    eyesGroup.add(leftEye);

    // Right Eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.2, 0, 0);
    eyesGroup.add(rightEye);

    // Subtle internal screen glow light
    const screenLight = new THREE.PointLight(0xffeedd, 1.2, 1.5);
    screenLight.position.set(0, 0.1, 0.7);
    headGroup.add(screenLight);

    // ─────────────────────────────────────────────────────────────
    // 4. Dangling Cable Wires (Drooping into the collar)
    // ─────────────────────────────────────────────────────────────
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x111113,
      roughness: 0.9,
      metalness: 0.1,
    });

    const createCable = (startX: number, startY: number, startZ: number, endX: number, endY: number, endZ: number) => {
      const midX = (startX + endX) * 0.5 + (Math.random() - 0.5) * 0.08;
      const midY = (startY + endY) * 0.5 - 0.15; // droop
      const midZ = (startZ + endZ) * 0.5 + 0.05;

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(startX, startY, startZ),
        new THREE.Vector3(midX, midY, midZ),
        new THREE.Vector3(endX, endY, endZ),
      ]);

      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.012, 8, false);
      return new THREE.Mesh(tubeGeo, cableMat);
    };

    // Add 4 cables on left and right side
    headGroup.add(createCable(-0.55, -0.4, 0.2, -0.28, -0.65, 0.15));
    headGroup.add(createCable(-0.48, -0.42, 0.3, -0.2, -0.68, 0.22));
    headGroup.add(createCable(0.55, -0.4, 0.2, 0.28, -0.65, 0.15));
    headGroup.add(createCable(0.48, -0.42, 0.3, 0.2, -0.68, 0.22));

    // ─────────────────────────────────────────────────────────────
    // 5. Mouse Hover & Interactive Head Rotation Tracking
    // ─────────────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized mouse coords (-1 to +1)
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      mouse.x = (clientX / rect.width) * 2 - 1;
      mouse.y = -(clientY / rect.height) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // ─────────────────────────────────────────────────────────────
    // 6. Animation Loop (Smooth Lerp + Idle Breathing + Blinking)
    // ─────────────────────────────────────────────────────────────
    let clock = new THREE.Clock();
    let blinkTimer = 0;
    let isBlinking = false;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth interpolation towards mouse position
      target.x += (mouse.x - target.x) * 0.08;
      target.y += (mouse.y - target.y) * 0.08;

      // Head tilts and turns smoothly
      headGroup.rotation.y = target.x * 0.65; // Horizontal turn
      headGroup.rotation.x = -target.y * 0.42 + 0.05; // Vertical tilt
      headGroup.rotation.z = -target.x * 0.12; // Slight head roll for realism

      // Eyes look further towards the cursor
      eyesGroup.position.x = target.x * 0.06;
      eyesGroup.position.y = 0.07 + target.y * 0.04;

      // Subtle breathing motion on torso and head
      const breath = Math.sin(elapsed * 1.8) * 0.015;
      characterGroup.position.y = -0.65 + breath;
      torsoMesh.scale.x = 1.35 + breath * 0.2;

      // Eye blink logic
      blinkTimer += delta;
      if (!isBlinking && blinkTimer > 3.8 + Math.random() * 2.5) {
        isBlinking = true;
        blinkTimer = 0;
      }

      if (isBlinking) {
        eyesGroup.scale.y = Math.max(0.08, eyesGroup.scale.y - delta * 12);
        if (eyesGroup.scale.y <= 0.1) {
          isBlinking = false;
        }
      } else {
        eyesGroup.scale.y = Math.min(1.0, eyesGroup.scale.y + delta * 10);
      }

      renderer.render(scene, camera);
    };

    animate();

    // ─────────────────────────────────────────────────────────────
    // 7. Resize Observer
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
