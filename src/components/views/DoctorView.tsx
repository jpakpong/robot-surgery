/**
 * Doctor View: Simulated Endoscopic Perspective
 * Renders the virtual surgical workspace, trocar entry, instrument tip, targets, and objects.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Vector3D,
  TargetZone,
  ObstacleZone,
  GraspableObject,
} from '../../types/simulation';
import { SIMULATION_CONFIG } from '../../simulation/simulationConfig';

interface DoctorViewProps {
  tipPos: Vector3D;
  gripperRatio: number;
  targets: TargetZone[];
  obstacles: ObstacleZone[];
  object?: GraspableObject;
  objects?: GraspableObject[];
  highlightTargetId?: string;
  highlightObjectId?: string;
  isColliding?: boolean;
  collisionType?: 'floor' | 'barrier' | null;
  isContactingObject?: boolean;
}

export const DoctorView: React.FC<DoctorViewProps> = ({
  tipPos,
  gripperRatio,
  targets,
  obstacles,
  object,
  objects,
  highlightTargetId,
  highlightObjectId,
  isColliding,
  collisionType,
  isContactingObject,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References to keep Three.js animation updated without re-mounting
  const stateRef = useRef({
    tipPos,
    gripperRatio,
    targets,
    obstacles,
    object,
    objects,
    highlightTargetId,
    highlightObjectId,
    isColliding,
    collisionType,
    isContactingObject,
  });

  stateRef.current = {
    tipPos,
    gripperRatio,
    targets,
    obstacles,
    object,
    objects,
    highlightTargetId,
    highlightObjectId,
    isColliding,
    collisionType,
    isContactingObject,
  };


  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101d); // Deep surgical endoscope dark blue/black
    scene.fog = new THREE.FogExp2(0x0a101d, 0.05);

    // 2. Camera: Endoscopic camera looking into the abdominal/phantom cavity
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 50);
    camera.position.set(0, 3.2, 5.8);
    camera.lookAt(0, 0.2, 0);

    // 3. Renderer with hardware detection
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Check if tablet or touch device to safeguard WebKit GPU memory ceiling
    const isTouchOrTablet =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        /iPad|iPhone|Android|Tablet/i.test(navigator.userAgent));

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && !isTouchOrTablet,
      powerPreference: 'high-performance',
      alpha: false,
      precision: isTouchOrTablet ? 'mediump' : 'highp',
    });
    renderer.setSize(width, height);
    const maxDpr = isTouchOrTablet ? 1.25 : 1.5;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, maxDpr));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. Lighting: Dual Endoscopic cold LED spotlights (surgeon light sources)
    const ambientLight = new THREE.HemisphereLight(0x2a3d5e, 0x090d16, 0.6);
    scene.add(ambientLight);

    const endoSpot1 = new THREE.SpotLight(0xffffff, 2.8, 14, Math.PI / 4, 0.4, 1.2);
    endoSpot1.position.set(-1.8, 4.0, 5.0);
    endoSpot1.target.position.set(0, 0, 0);
    endoSpot1.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      endoSpot1.shadow.mapSize.width = 512;
      endoSpot1.shadow.mapSize.height = 512;
      endoSpot1.shadow.bias = -0.001;
    }
    scene.add(endoSpot1);
    scene.add(endoSpot1.target);

    const endoSpot2 = new THREE.SpotLight(0x99ddff, 2.0, 14, Math.PI / 4, 0.4, 1.2);
    endoSpot2.position.set(1.8, 4.0, 5.0);
    endoSpot2.target.position.set(0, 0, 0);
    scene.add(endoSpot2);
    scene.add(endoSpot2.target);

    // 5. Surgical Phantom Cavity Environment
    const cavityGroup = new THREE.Group();

    // Curved tissue floor
    const floorGeo = new THREE.PlaneGeometry(9, 9, 32, 32);
    // Add subtle organic curve
    const posAttr = floorGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const dist = Math.sqrt(vx * vx + vy * vy);
      posAttr.setZ(i, -Math.cos(dist * 0.4) * 0.25);
    }
    floorGeo.computeVertexNormals();

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1f293d,
      roughness: 0.75,
      metalness: 0.1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1.2;
    floorMesh.receiveShadow = !isSoftwareGl;
    cavityGroup.add(floorMesh);

    // Surgical grid lines (training box markings)
    const gridHelper = new THREE.GridHelper(8, 16, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -1.18;
    cavityGroup.add(gridHelper);

    // Trocar entry port visualization at top
    const trocarGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.6, 16);
    const trocarMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const trocarMesh = new THREE.Mesh(trocarGeo, trocarMat);
    const trocarPos = SIMULATION_CONFIG.trocarPort;
    trocarMesh.position.set(trocarPos.x, trocarPos.y, trocarPos.z);
    cavityGroup.add(trocarMesh);

    scene.add(cavityGroup);

    // 6. Procedural Robotic Instrument (Shaft + EndoWrist + Micro Gripper Jaws)
    const instrumentGroup = new THREE.Group();

    // Stainless steel shaft passing through trocar to tip
    const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 16);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.95,
      roughness: 0.15,
    });
    const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
    shaftMesh.castShadow = !isSoftwareGl;
    instrumentGroup.add(shaftMesh);

    // Wrist knuckle joint
    const wristGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const wristMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // da Vinci cyan accent
      metalness: 0.8,
      roughness: 0.25,
    });
    const wristMesh = new THREE.Mesh(wristGeo, wristMat);
    instrumentGroup.add(wristMesh);

    // Gripper base hub
    const hubGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.15, 12);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.2,
    });
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    instrumentGroup.add(hubMesh);

    // Left and right micro-gripper jaw blades
    const jawGeo = new THREE.BoxGeometry(0.04, 0.32, 0.06);
    jawGeo.translate(0, 0.16, 0); // pivot at base of jaw
    const jawMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.9,
      roughness: 0.1,
    });

    const leftJaw = new THREE.Mesh(jawGeo, jawMat);
    leftJaw.castShadow = !isSoftwareGl;
    const rightJaw = new THREE.Mesh(jawGeo, jawMat);
    rightJaw.castShadow = !isSoftwareGl;

    instrumentGroup.add(leftJaw);
    instrumentGroup.add(rightJaw);

    // Aiming laser / tip beacon
    const tipBeaconGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const tipBeaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const tipBeacon = new THREE.Mesh(tipBeaconGeo, tipBeaconMat);
    instrumentGroup.add(tipBeacon);

    scene.add(instrumentGroup);

    // 7. Dynamic Targets Pool (Zero per-frame allocations)
    const targetsGroup = new THREE.Group();
    const sharedTargetSphereGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const sharedTargetRingGeo = new THREE.RingGeometry(0.85, 1.05, 24);

    const targetSlots = [0, 1, 2, 3, 4, 5].map(() => {
      const slotGroup = new THREE.Group();
      const sMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.65,
        emissive: 0x10b981,
        roughness: 0.3,
      });
      const sMesh = new THREE.Mesh(sharedTargetSphereGeo, sMat);
      slotGroup.add(sMesh);

      const rMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });
      const rMesh = new THREE.Mesh(sharedTargetRingGeo, rMat);
      rMesh.rotation.x = Math.PI / 2;
      slotGroup.add(rMesh);

      slotGroup.visible = false;
      targetsGroup.add(slotGroup);
      return { slotGroup, sMesh, sMat, rMesh, rMat };
    });
    scene.add(targetsGroup);

    // 8. Dynamic Obstacles Pool (Zero per-frame allocations)
    const obstaclesGroup = new THREE.Group();
    const sharedBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const sharedWireGeo = new THREE.WireframeGeometry(sharedBoxGeo);

    const obstacleSlots = [0, 1, 2, 3, 4].map(() => {
      const slotGroup = new THREE.Group();
      const oMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.55,
        roughness: 0.5,
        metalness: 0.2,
      });
      const oMesh = new THREE.Mesh(sharedBoxGeo, oMat);
      oMesh.castShadow = !isSoftwareGl;
      slotGroup.add(oMesh);

      const wireMat = new THREE.LineBasicMaterial({
        color: 0xff8888,
        linewidth: 1,
      });
      const wireMesh = new THREE.LineSegments(sharedWireGeo, wireMat);
      slotGroup.add(wireMesh);

      slotGroup.visible = false;
      obstaclesGroup.add(slotGroup);
      return { slotGroup, oMesh, oMat, wireMesh };
    });
    scene.add(obstaclesGroup);

    // 9. Dynamic Objects Pool (Supports Task 2 and Task 3 multi-color specimens, sized close to gripper tip)
    const objectSlots = [0, 1, 2].map(() => {
      const slotGroup = new THREE.Group();
      const beadGeo = new THREE.SphereGeometry(0.16, 20, 20);
      const beadMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.3,
        roughness: 0.25,
        emissive: 0xd97706,
        emissiveIntensity: 0.25,
      });
      const beadMesh = new THREE.Mesh(beadGeo, beadMat);
      beadMesh.castShadow = !isSoftwareGl;
      slotGroup.add(beadMesh);

      // Bead stand / pedestal
      const standGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.14, 16);
      const standMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.6,
        roughness: 0.4,
      });
      const standMesh = new THREE.Mesh(standGeo, standMat);
      standMesh.position.y = -0.12;
      slotGroup.add(standMesh);

      // Specimen proximity aura ring
      const ringGeo = new THREE.RingGeometry(0.24, 0.30, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = -0.17;
      slotGroup.add(ringMesh);

      slotGroup.visible = false;
      scene.add(slotGroup);
      return { slotGroup, beadMat, standMesh, ringMesh, ringMat };
    });

    // 10. Reusable vectors for zero-allocation animation loop
    const _trocar = new THREE.Vector3(trocarPos.x, trocarPos.y, trocarPos.z);
    const _tip = new THREE.Vector3();
    const _shaftDir = new THREE.Vector3();
    const _normalizedShaftDir = new THREE.Vector3();
    const _mid = new THREE.Vector3();
    const _up = new THREE.Vector3(0, 1, 0);

    // 11. Animation tick
    let frameId: number;
    let clock = new THREE.Clock();

    const render = () => {
      const elapsed = clock.getElapsedTime();
      const current = stateRef.current;

      // Update Tip Position & Instrument Shaft
      _tip.set(current.tipPos.x, current.tipPos.y, current.tipPos.z);
      _shaftDir.subVectors(_tip, _trocar);
      const shaftLen = _shaftDir.length();
      _mid.addVectors(_trocar, _tip).multiplyScalar(0.5);

      // Position and orient shaft cylinder (no clone allocation)
      shaftMesh.scale.set(1, shaftLen, 1);
      shaftMesh.position.copy(_mid);
      _normalizedShaftDir.copy(_shaftDir).normalize();
      shaftMesh.quaternion.setFromUnitVectors(_up, _normalizedShaftDir);

      // Position wrist knuckle and gripper hub at tip
      wristMesh.position.copy(_tip);
      hubMesh.position.copy(_tip);
      tipBeacon.position.copy(_tip);

      // Jaws open/close rotation based on gripperRatio (0.0 = closed, 1.0 = open)
      const openAngle = (current.gripperRatio || 0) * 0.52; // max ~30 degrees
      leftJaw.position.copy(_tip);
      rightJaw.position.copy(_tip);

      // Align jaws along shaft direction with outward jaw pitch
      leftJaw.quaternion.copy(shaftMesh.quaternion);
      rightJaw.quaternion.copy(shaftMesh.quaternion);
      leftJaw.rotateZ(openAngle);
      rightJaw.rotateZ(-openAngle);

      // Flash tip beacon if colliding with obstacle or contacting object
      if (current.isColliding) {
        tipBeaconMat.color.setHex(0xff1111);
        tipBeacon.scale.setScalar(1.5 + Math.sin(elapsed * 12) * 0.4);
      } else if (current.isContactingObject) {
        tipBeaconMat.color.setHex(0xf59e0b); // Amber contact warning
        tipBeacon.scale.setScalar(1.2);
      } else {
        tipBeaconMat.color.setHex(0x38bdf8);
        tipBeacon.scale.setScalar(1.0);
      }

      // Update Target Meshes (Pooled - Zero Allocation)
      const currentTargets = current.targets || [];
      targetSlots.forEach((slot, idx) => {
        const tgt = currentTargets[idx];
        if (tgt) {
          slot.slotGroup.visible = true;
          slot.slotGroup.position.set(tgt.position.x, tgt.position.y, tgt.position.z);
          const r = tgt.radius || 0.25;
          slot.sMesh.scale.setScalar(r);
          slot.rMesh.scale.setScalar(r);
          slot.rMesh.rotation.z = elapsed * 1.2;

          const isHighlighted = tgt.id === current.highlightTargetId;
          const tgtColor = tgt.color || 0x10b981;
          slot.sMat.color.set(tgtColor);
          slot.sMat.emissive.set(tgtColor);
          slot.sMat.emissiveIntensity = isHighlighted ? 0.7 + Math.sin(elapsed * 4) * 0.3 : 0.3;
          slot.rMat.color.set(tgtColor);
          slot.rMat.opacity = isHighlighted ? 0.8 : 0.4;
        } else {
          slot.slotGroup.visible = false;
        }
      });

      // Update Obstacle Meshes (Pooled - Zero Allocation)
      const currentObstacles = current.obstacles || [];
      obstacleSlots.forEach((slot, idx) => {
        const obs = currentObstacles[idx];
        if (obs) {
          slot.slotGroup.visible = true;
          slot.slotGroup.position.set(obs.position.x, obs.position.y, obs.position.z);
          slot.oMesh.scale.set(obs.size.x, obs.size.y, obs.size.z);
          slot.wireMesh.scale.set(obs.size.x, obs.size.y, obs.size.z);
          const obsColor = obs.color || 0xef4444;
          slot.oMat.color.set(obsColor);
        } else {
          slot.slotGroup.visible = false;
        }
      });

      // Update Specimen Objects (Zero Allocation)
      const rawObjects =
        current.objects && current.objects.length > 0
          ? current.objects
          : current.object
          ? [current.object]
          : [];

      objectSlots.forEach((slot, idx) => {
        const obj = rawObjects[idx];
        if (obj) {
          slot.slotGroup.visible = true;
          slot.slotGroup.position.set(obj.position.x, obj.position.y, obj.position.z);
          const objColorHex = obj.color || 0xf59e0b;
          slot.beadMat.color.set(objColorHex);
          slot.beadMat.emissive.set(objColorHex);

          // Pulsing glow if this object is currently highlighted in mission step
          const isObjHighlighted = obj.id === current.highlightObjectId;
          if (isObjHighlighted) {
            slot.beadMat.emissiveIntensity = 0.55 + Math.sin(elapsed * 5) * 0.35;
            slot.ringMesh.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.12);
            slot.ringMat.color.setHex(0xffffff);
          } else {
            slot.beadMat.emissiveIntensity = 0.25;
            slot.ringMesh.scale.setScalar(1);
            slot.ringMat.color.set(objColorHex);
          }

          // Show stand only if specimen has not yet been lifted/delivered
          slot.standMesh.visible = !obj.isGrasped && obj.position.y < 0.0 && !obj.isDelivered;
        } else {
          slot.slotGroup.visible = false;
        }
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    // 12. Resize observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);

      // Deep GPU resource disposal
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh || (obj as THREE.LineSegments).isLineSegments) {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });

      renderer.dispose();
      renderer.forceContextLoss?.();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* Endoscopic View Vignette & Lens HUD */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-white/10 [box-shadow:inset_0_0_60px_rgba(0,0,0,0.85)]" />

      {/* Top HUD Badge: Endoscope POV */}
      <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-sky-500/30 text-white shadow-lg">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-semibold tracking-wide text-sky-200">DOCTOR VIEW</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Stereo Endoscope</span>
      </div>

      {/* Telemetry Corner Readout */}
      <div className="absolute bottom-3 left-3 pointer-events-none bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-300 flex items-center gap-3">
        <div>
          <span className="text-slate-500">POS: </span>
          <span className="text-sky-300">
            X:{tipPos.x.toFixed(1)} Y:{tipPos.y.toFixed(1)} Z:{tipPos.z.toFixed(1)}
          </span>
        </div>
        <div className="border-l border-slate-700 pl-2">
          <span className="text-slate-500">JAW: </span>
          <span className={gripperRatio > 0.5 ? 'text-amber-400' : 'text-emerald-400'}>
            {Math.round(gripperRatio * 100)}% {gripperRatio > 0.5 ? 'OPEN' : 'CLAMPED'}
          </span>
        </div>
      </div>

      {/* Red Flash Collision Border & Vignette */}
      {isColliding && (
        <div className="absolute inset-0 pointer-events-none z-30 rounded-2xl border-[5px] border-rose-500/95 shadow-[inset_0_0_80px_rgba(244,63,94,0.7)] animate-redFlash" />
      )}

      {/* Collision Alert Banner */}
      {isColliding && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 pointer-events-none bg-rose-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide border-2 border-rose-300 shadow-xl animate-bounce flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
          <span>
            {collisionType === 'floor'
              ? 'COLLISION ALERT: CONTACT WITH TRAY FLOOR — PASS-THROUGH BLOCKED'
              : 'COLLISION ALERT: CONTACT WITH BARRIER — PASS-THROUGH BLOCKED'}
          </span>
        </div>
      )}

      {/* Real Physical Contact Warning Banner */}
      {isContactingObject && !isColliding && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-amber-500/95 text-slate-950 px-3.5 py-1.5 rounded-md text-xs font-bold tracking-wide border border-amber-300 shadow-lg animate-pulse flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>
          <span>PHYSICAL CONTACT: TIP TOUCHING SPECIMEN</span>
        </div>
      )}
    </div>
  );

};
