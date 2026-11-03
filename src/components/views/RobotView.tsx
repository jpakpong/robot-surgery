/**
 * Robot View: 3D Visualization of the 6-DOF Robotic Surgical Manipulator
 * Procedurally models the patient-side cart, setup column, articulated links,
 * Remote Center of Motion trocar port, and surgical instrument.
 * Fully synchronized with Doctor View: identical table workspace, targets, and specimen object.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  JointAngles,
  Vector3D,
  TargetZone,
  ObstacleZone,
  GraspableObject,
} from '../../types/simulation';
import { solveForwardKinematics } from '../../simulation/kinematics';
import { SIMULATION_CONFIG } from '../../simulation/simulationConfig';
import { Eye, RotateCcw, Compass } from 'lucide-react';

interface RobotViewProps {
  joints: JointAngles;
  tipPos: Vector3D;
  gripperRatio: number;
  targets?: TargetZone[];
  obstacles?: ObstacleZone[];
  object?: GraspableObject;
  objects?: GraspableObject[];
  highlightTargetId?: string;
  highlightObjectId?: string;
  isColliding?: boolean;
  collisionType?: 'floor' | 'barrier' | null;
  isContactingObject?: boolean;
}

export const RobotView: React.FC<RobotViewProps> = ({
  joints,
  tipPos,
  gripperRatio,
  targets = [],
  obstacles = [],
  object,
  objects,
  highlightTargetId,
  highlightObjectId,
  isColliding,
  collisionType,
  isContactingObject,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const stateRef = useRef({
    joints,
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
    joints,
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


  const [activePreset, setActivePreset] = useState<'iso' | 'side' | 'top'>('iso');

  // Camera presets
  const applyPreset = (preset: 'iso' | 'side' | 'top') => {
    setActivePreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;

    if (preset === 'iso') {
      cameraRef.current.position.set(7.5, 6.5, 7.5);
      controlsRef.current.target.set(0, 1.2, 0);
    } else if (preset === 'side') {
      cameraRef.current.position.set(10.5, 3.2, 0);
      controlsRef.current.target.set(0, 1.2, 0);
    } else if (preset === 'top') {
      cameraRef.current.position.set(0, 11.5, 0.1);
      controlsRef.current.target.set(0, 1.2, 0);
    }
    controlsRef.current.update();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900 clinical operating theater ambient
    scene.fog = new THREE.FogExp2(0x0f172a, 0.032);

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    camera.position.set(7.5, 6.5, 7.5);
    cameraRef.current = camera;

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
      precision: isTouchOrTablet ? 'mediump' : 'highp',
    });
    renderer.setSize(width, height);
    const maxDpr = isTouchOrTablet ? 1.25 : 1.5;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, maxDpr));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.target.set(0, 1.2, 0);
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(8, 14, 8);
    dirLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      dirLight.shadow.mapSize.width = 512;
      dirLight.shadow.mapSize.height = 512;
      dirLight.shadow.bias = -0.0005;
    }
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    fillLight.position.set(-6, 8, -6);
    scene.add(fillLight);

    // Theater Floor
    const floorGeo = new THREE.PlaneGeometry(24, 24);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1.8;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    const grid = new THREE.GridHelper(20, 20, 0x0284c7, 0x334155);
    grid.position.y = -1.79;
    scene.add(grid);

    // -------------------------------------------------------------
    // SURGICAL WORKSPACE TABLE (Identical to Doctor View)
    // -------------------------------------------------------------
    const tableGroup = new THREE.Group();

    // Sterile Surgical Operating Table Base
    const tableBaseGeo = new THREE.BoxGeometry(7.2, 0.5, 7.2);
    const tableBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e, // Surgical sterile drape teal
      roughness: 0.7,
      metalness: 0.1,
    });
    const tableBase = new THREE.Mesh(tableBaseGeo, tableBaseMat);
    tableBase.position.set(0, -1.45, 0);
    tableBase.receiveShadow = !isSoftwareGl;
    tableBase.castShadow = !isSoftwareGl;
    tableGroup.add(tableBase);

    // Surgical Phantom Cavity Table Floor (identical to Doctor View at y = -1.2)
    const cavityFloorGeo = new THREE.PlaneGeometry(6.8, 6.8);
    const cavityFloorMat = new THREE.MeshStandardMaterial({
      color: 0x1f293d,
      roughness: 0.75,
      metalness: 0.1,
    });
    const cavityFloor = new THREE.Mesh(cavityFloorGeo, cavityFloorMat);
    cavityFloor.rotation.x = -Math.PI / 2;
    cavityFloor.position.y = -1.2;
    cavityFloor.receiveShadow = !isSoftwareGl;
    tableGroup.add(cavityFloor);

    // Surgical grid markings (identical grid spacing & color as Doctor View)
    const surgicalGrid = new THREE.GridHelper(6.8, 14, 0x38bdf8, 0x1e293b);
    surgicalGrid.position.y = -1.19;
    tableGroup.add(surgicalGrid);

    // Sterile patient drape perimeter walls
    const drapeGeo = new THREE.BoxGeometry(7.4, 0.4, 7.4);
    const drapeMat = new THREE.MeshStandardMaterial({
      color: 0x134e4a,
      roughness: 0.8,
    });
    const drapeBorder = new THREE.Mesh(drapeGeo, drapeMat);
    drapeBorder.position.set(0, -1.1, 0);
    tableGroup.add(drapeBorder);

    // Trocar Entry Guide Port at (0, 4.2, 0.2)
    const trocarPos = SIMULATION_CONFIG.trocarPort;
    const trocarSleeveGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.6, 16);
    const trocarSleeveMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const trocarSleeve = new THREE.Mesh(trocarSleeveGeo, trocarSleeveMat);
    trocarSleeve.position.set(trocarPos.x, trocarPos.y, trocarPos.z);
    tableGroup.add(trocarSleeve);

    // Patient Trocar Ring Indicator
    const trocarRingGeo = new THREE.TorusGeometry(0.35, 0.06, 16, 32);
    const trocarRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
    });
    const trocarRing = new THREE.Mesh(trocarRingGeo, trocarRingMat);
    trocarRing.rotation.x = Math.PI / 2;
    trocarRing.position.set(trocarPos.x, trocarPos.y - 0.2, trocarPos.z);
    tableGroup.add(trocarRing);

    scene.add(tableGroup);

    // -------------------------------------------------------------
    // DYNAMIC TARGETS, OBSTACLES & SPECIMEN GROUPS (Synchronized Pools)
    // -------------------------------------------------------------
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

    // Multi-color Specimen Beads & Pedestals Pool (sized close to gripper tip)
    const objectSlots = [0, 1, 2].map(() => {
      const slotGroup = new THREE.Group();
      const beadGeo = new THREE.SphereGeometry(0.16, 24, 24);
      const beadMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.3,
        roughness: 0.25,
        emissive: 0xd97706,
        emissiveIntensity: 0.3,
      });
      const beadMesh = new THREE.Mesh(beadGeo, beadMat);
      beadMesh.castShadow = !isSoftwareGl;
      slotGroup.add(beadMesh);

      const standGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.14, 16);
      const standMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.6,
        roughness: 0.4,
      });
      const standMesh = new THREE.Mesh(standGeo, standMat);
      standMesh.position.y = -0.12;
      slotGroup.add(standMesh);

      const ringGeo = new THREE.RingGeometry(0.24, 0.30, 32);
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

    // -------------------------------------------------------------
    // PROCEDURAL 6-DOF ROBOTIC ARM ASSEMBLY (da Vinci 5 style)
    // -------------------------------------------------------------
    const robotGroup = new THREE.Group();

    // 1. Mobile Cart Base
    const cartGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.6, 32);
    const cartMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.4,
      roughness: 0.3,
    });
    const cartBase = new THREE.Mesh(cartGeo, cartMat);
    cartBase.position.set(-2.8, 0.3, -3.8);
    cartBase.castShadow = !isSoftwareGl;
    robotGroup.add(cartBase);

    // 2. Vertical Setup Column with da Vinci 5 blue LED light pipe
    const columnGeo = new THREE.CylinderGeometry(0.38, 0.45, 3.2, 24);
    const columnMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.5,
      roughness: 0.25,
    });
    const column = new THREE.Mesh(columnGeo, columnMat);
    column.position.set(-2.8, 2.0, -3.8);
    column.castShadow = !isSoftwareGl;
    robotGroup.add(column);

    const ledGeo = new THREE.CylinderGeometry(0.4, 0.4, 2.6, 16, 1, true, -Math.PI / 6, Math.PI / 3);
    const ledMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      side: THREE.DoubleSide,
    });
    const ledStrip = new THREE.Mesh(ledGeo, ledMat);
    ledStrip.position.copy(column.position);
    robotGroup.add(ledStrip);

    // 3. Rotating Turret (Joint 1: Base Yaw)
    const turretGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.45, 24);
    const turretMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.2,
    });
    const turret = new THREE.Mesh(turretGeo, turretMat);
    turret.position.set(-2.8, 3.7, -3.8);
    robotGroup.add(turret);

    // 4. Shoulder Joint Assembly (Joint 2: Shoulder Pitch)
    const shoulderKnuckleGeo = new THREE.SphereGeometry(0.42, 20, 20);
    const shoulderKnuckleMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
      roughness: 0.2,
    });
    const shoulderKnuckle = new THREE.Mesh(shoulderKnuckleGeo, shoulderKnuckleMat);
    shoulderKnuckle.position.set(-2.8, 4.0, -3.8);
    robotGroup.add(shoulderKnuckle);

    // 5. Upper Arm Link
    const upperArmGeo = new THREE.CylinderGeometry(0.22, 0.26, 1, 16);
    const upperArmMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.35,
      roughness: 0.25,
    });
    const upperArm = new THREE.Mesh(upperArmGeo, upperArmMat);
    upperArm.castShadow = !isSoftwareGl;
    robotGroup.add(upperArm);

    // 6. Elbow Joint (Joint 3: Elbow Pitch)
    const elbowKnuckleGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.5, 16);
    elbowKnuckleGeo.rotateZ(Math.PI / 2);
    const elbowKnuckleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.25,
    });
    const elbowKnuckle = new THREE.Mesh(elbowKnuckleGeo, elbowKnuckleMat);
    robotGroup.add(elbowKnuckle);

    // 7. Forearm Link
    const forearmGeo = new THREE.BoxGeometry(0.3, 1, 0.35);
    const forearmMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.45,
      roughness: 0.3,
    });
    const forearm = new THREE.Mesh(forearmGeo, forearmMat);
    forearm.castShadow = !isSoftwareGl;
    robotGroup.add(forearm);

    // 8. Carriage
    const carriageGeo = new THREE.BoxGeometry(0.45, 0.65, 0.5);
    const carriageMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.7,
      roughness: 0.3,
    });
    const carriage = new THREE.Mesh(carriageGeo, carriageMat);
    robotGroup.add(carriage);

    // 9. Surgical Instrument Shaft
    const instrumentShaftGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 16);
    const instrumentShaftMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.95,
      roughness: 0.15,
    });
    const instrumentShaft = new THREE.Mesh(instrumentShaftGeo, instrumentShaftMat);
    instrumentShaft.castShadow = !isSoftwareGl;
    robotGroup.add(instrumentShaft);

    // 10. EndoWrist Distal Micro-Joint
    const wristBallGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const wristBallMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
    });
    const wristBall = new THREE.Mesh(wristBallGeo, wristBallMat);
    robotGroup.add(wristBall);

    // 11. Synchronized Micro-Gripper Jaws (Left & Right)
    const jawGeo = new THREE.BoxGeometry(0.03, 0.24, 0.04);
    jawGeo.translate(0, 0.12, 0);
    const jawMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.9,
      roughness: 0.1,
    });
    const leftJaw = new THREE.Mesh(jawGeo, jawMat);
    const rightJaw = new THREE.Mesh(jawGeo, jawMat);
    robotGroup.add(leftJaw);
    robotGroup.add(rightJaw);

    // Tip beacon for contact and collision indication
    const tipBeaconGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const tipBeaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const tipBeacon = new THREE.Mesh(tipBeaconGeo, tipBeaconMat);
    robotGroup.add(tipBeacon);

    scene.add(robotGroup);

    // Reusable math vectors (zero allocation)
    const _up = new THREE.Vector3(0, 1, 0);
    const _vDiff = new THREE.Vector3();
    const _vMid = new THREE.Vector3();
    const _normLink = new THREE.Vector3();
    const _shaftQuat = new THREE.Quaternion();

    function orientLink(mesh: THREE.Mesh, p1: Vector3D, p2: Vector3D, diameterScale: number = 1) {
      _vDiff.set(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
      const len = _vDiff.length();
      _vMid.set((p1.x + p2.x) * 0.5, (p1.y + p2.y) * 0.5, (p1.z + p2.z) * 0.5);

      mesh.scale.set(diameterScale, len, diameterScale);
      mesh.position.copy(_vMid);
      _normLink.copy(_vDiff).normalize();
      mesh.quaternion.setFromUnitVectors(_up, _normLink);
    }

    // Animation render loop
    let frameId: number;
    let clock = new THREE.Clock();

    const render = () => {
      const elapsed = clock.getElapsedTime();
      const current = stateRef.current;
      controls.update();

      // Forward kinematics
      const fk = solveForwardKinematics(current.joints, current.tipPos);

      // Rotate turret
      turret.rotation.y = current.joints.baseYaw;

      // Knuckles
      shoulderKnuckle.position.set(fk.shoulderPos.x, fk.shoulderPos.y, fk.shoulderPos.z);
      elbowKnuckle.position.set(fk.elbowPos.x, fk.elbowPos.y, fk.elbowPos.z);

      // Links (zero allocation)
      orientLink(upperArm, fk.shoulderPos, fk.elbowPos, 1);
      orientLink(forearm, fk.elbowPos, fk.instrumentEntryPos, 1);
      carriage.position.set(fk.instrumentEntryPos.x, fk.instrumentEntryPos.y, fk.instrumentEntryPos.z);
      orientLink(instrumentShaft, fk.instrumentEntryPos, fk.tipPos, 1);

      // Wrist and tip beacon
      wristBall.position.set(fk.tipPos.x, fk.tipPos.y, fk.tipPos.z);
      tipBeacon.position.set(fk.tipPos.x, fk.tipPos.y, fk.tipPos.z);

      // Beacon color and red collision pulsing
      if (current.isColliding) {
        tipBeaconMat.color.setHex(0xff1111);
        tipBeacon.scale.setScalar(1.5 + Math.sin(elapsed * 12) * 0.4);
      } else if (current.isContactingObject) {
        tipBeaconMat.color.setHex(0xf59e0b);
        tipBeacon.scale.setScalar(1.2);
      } else {
        tipBeaconMat.color.setHex(0x38bdf8);
        tipBeacon.scale.setScalar(1.0);
      }

      // Synchronized gripper jaws (zero allocation)
      _vDiff.set(fk.tipPos.x - fk.trocarPos.x, fk.tipPos.y - fk.trocarPos.y, fk.tipPos.z - fk.trocarPos.z);
      _normLink.copy(_vDiff).normalize();
      _shaftQuat.setFromUnitVectors(_up, _normLink);

      leftJaw.position.copy(wristBall.position);
      rightJaw.position.copy(wristBall.position);
      leftJaw.quaternion.copy(_shaftQuat);
      rightJaw.quaternion.copy(_shaftQuat);

      const openAngle = (current.gripperRatio || 0) * 0.52;
      leftJaw.rotateZ(openAngle);
      rightJaw.rotateZ(-openAngle);

      // Synchronize Target Meshes on the Table (Pooled - Zero Allocation)
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

      // Synchronize Obstacle Meshes on the Table (Pooled - Zero Allocation)
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

      // Synchronize Specimen Objects on the Table (Zero Allocation)
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

          slot.standMesh.visible = !obj.isGrasped && obj.position.y < 0.0 && !obj.isDelivered;
        } else {
          slot.slotGroup.visible = false;
        }
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

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
      controls.dispose();

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
    <div className="relative w-full h-full flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top HUD Badge: 3D Robot Arm */}
      <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 text-white shadow-lg">
        <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
        <span className="text-xs font-semibold tracking-wide text-cyan-200">ROBOT VIEW</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Synchronized Field</span>
      </div>

      {/* Telemetry Corner Readout */}
      <div className="absolute bottom-3 left-3 pointer-events-none bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-300 flex items-center gap-3">
        <div>
          <span className="text-slate-500">ARM TIP: </span>
          <span className="text-cyan-300">
            X:{tipPos.x.toFixed(1)} Y:{tipPos.y.toFixed(1)} Z:{tipPos.z.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Camera View Angle Presets */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg">
        <button
          onClick={() => applyPreset('iso')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
            activePreset === 'iso'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Isometric View"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Iso</span>
        </button>
        <button
          onClick={() => applyPreset('side')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
            activePreset === 'side'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Side Profile"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Side</span>
        </button>
        <button
          onClick={() => applyPreset('top')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
            activePreset === 'top'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Top Down"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Top</span>
        </button>
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
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-amber-500/95 text-slate-950 px-3 py-1 rounded-md text-xs font-bold tracking-wide border border-amber-300 shadow-lg animate-pulse flex items-center gap-1.5">
          <span>PHYSICAL CONTACT DETECTED</span>
        </div>
      )}


      {/* Orbit Tip Guidance */}
      <div className="absolute bottom-3 right-3 pointer-events-none bg-slate-950/70 backdrop-blur-sm border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-400 flex items-center gap-1.5">
        <span>Drag to orbit • Pinch to zoom</span>
      </div>
    </div>
  );
};
