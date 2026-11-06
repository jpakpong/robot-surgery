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

    // -------------------------------------------------------------
    // OPERATING THEATER LIGHTING & SURGICAL LUMINAIRE BOOM ASSEMBLY
    // -------------------------------------------------------------
    // Diffuse hospital operating room sky/ground ambient
    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 1.05);
    scene.add(hemiLight);

    // General operating room fill luminaire
    const roomFillLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    roomFillLight.position.set(-8, 10, -8);
    scene.add(roomFillLight);

    // Common surgical focal target (center of operative phantom table)
    const surgicalTarget = new THREE.Object3D();
    surgicalTarget.position.set(0, -1.18, 0);
    scene.add(surgicalTarget);

    // Dual-Head Ceiling Surgical Operating Luminaire Boom Assembly
    const luminaireGroup = new THREE.Group();

    const luminaireWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.12,
    });
    const luminaireMetalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.25,
      metalness: 0.8,
    });
    const luminaireChromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.92,
    });
    const faceplateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.4,
    });
    const luminaireLedMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf8fafc,
      emissiveIntensity: 0.95,
      roughness: 0.1,
    });
    const ledPodGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.025, 12);

    // Ceiling Mount Flange (grounded at ceiling height y = 6.75)
    const ceilingFlangeGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.1, 32);
    const ceilingFlange = new THREE.Mesh(ceilingFlangeGeo, luminaireWhiteMat);
    ceilingFlange.position.set(0.3, 6.75, 0.2);
    luminaireGroup.add(ceilingFlange);

    // Vertical Central Drop Column
    const dropColumnGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 24);
    const dropColumn = new THREE.Mesh(dropColumnGeo, luminaireChromeMat);
    dropColumn.position.set(0.3, 5.95, 0.2);
    luminaireGroup.add(dropColumn);

    // Central Rotation Pivot Collar / Dual Swivel Hub
    const pivotHubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.32, 24);
    const pivotHub = new THREE.Mesh(pivotHubGeo, luminaireWhiteMat);
    pivotHub.position.set(0.3, 5.2, 0.2);
    luminaireGroup.add(pivotHub);

    // Helper to build an articulated structural boom arm between two points
    const createBoomArm = (pA: THREE.Vector3, pB: THREE.Vector3, radius: number = 0.045) => {
      const armGroup = new THREE.Group();
      const dist = pA.distanceTo(pB);
      const armGeo = new THREE.CylinderGeometry(radius, radius, dist, 16);
      const armMesh = new THREE.Mesh(armGeo, luminaireWhiteMat);
      const dir = pB.clone().sub(pA).normalize();
      const mid = pA.clone().add(pB).multiplyScalar(0.5);
      armMesh.position.copy(mid);
      armMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      armGroup.add(armMesh);
      return armGroup;
    };

    // ==========================================================
    // 1. PRIMARY MASTER SURGICAL LIGHTHEAD (Left Anterior Vector)
    // ==========================================================
    const hubPos1 = new THREE.Vector3(0.3, 5.28, 0.2);
    const elbowPos1 = new THREE.Vector3(-0.6, 5.35, 0.8);
    const headPos1 = new THREE.Vector3(-1.5, 4.8, 1.3);

    luminaireGroup.add(createBoomArm(hubPos1, elbowPos1, 0.05));

    // Spring Counterbalance Box at Arm Knuckle
    const springBoxGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.26, 16);
    const springBox1 = new THREE.Mesh(springBoxGeo, luminaireMetalMat);
    springBox1.position.copy(elbowPos1);
    springBox1.rotation.z = Math.PI / 4;
    luminaireGroup.add(springBox1);

    luminaireGroup.add(createBoomArm(elbowPos1, headPos1, 0.04));

    // Direction vector aimed directly at operative phantom table
    const targetVector1 = surgicalTarget.position.clone().sub(headPos1).normalize();
    const headQuat1 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), targetVector1);

    const masterHeadGroup = new THREE.Group();
    masterHeadGroup.position.copy(headPos1);

    // Gimbal Suspension Yoke Bracket
    const yokeGeo = new THREE.TorusGeometry(0.72, 0.032, 12, 24, Math.PI);
    const yokeMesh = new THREE.Mesh(yokeGeo, luminaireMetalMat);
    yokeMesh.rotation.x = Math.PI / 2;
    masterHeadGroup.add(yokeMesh);

    // Lamp Head Housing
    const dishHousingGroup = new THREE.Group();
    dishHousingGroup.quaternion.copy(headQuat1);

    const dishBackGeo = new THREE.CylinderGeometry(0.66, 0.72, 0.12, 32);
    const dishBack = new THREE.Mesh(dishBackGeo, luminaireWhiteMat);
    dishHousingGroup.add(dishBack);

    // Recessed Dark Metal Bezel
    const dishBezelGeo = new THREE.CylinderGeometry(0.73, 0.73, 0.03, 32);
    const dishBezel = new THREE.Mesh(dishBezelGeo, luminaireMetalMat);
    dishBezel.position.y = -0.065;
    dishHousingGroup.add(dishBezel);

    // Circular Multi-LED Reflector Faceplate
    const faceplateGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.02, 32);
    const faceplateMesh = new THREE.Mesh(faceplateGeo, faceplateMat);
    faceplateMesh.position.y = -0.075;
    dishHousingGroup.add(faceplateMesh);

    // Concentric Rings of Patterned Daylight Surgical LED Pods
    const addMasterLedRing = (radius: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const ledMesh = new THREE.Mesh(ledPodGeo, luminaireLedMat);
        ledMesh.position.set(Math.cos(angle) * radius, -0.082, Math.sin(angle) * radius);
        dishHousingGroup.add(ledMesh);
      }
    };
    addMasterLedRing(0.20, 6);
    addMasterLedRing(0.38, 12);
    addMasterLedRing(0.55, 18);

    // Central Sterilizable Guide Handle
    const handleGeo = new THREE.CylinderGeometry(0.032, 0.035, 0.22, 16);
    const handleMesh = new THREE.Mesh(handleGeo, luminaireMetalMat);
    handleMesh.position.y = -0.18;
    dishHousingGroup.add(handleMesh);

    // Sterile Positioning Rim Ring
    const rimRingGeo = new THREE.TorusGeometry(0.75, 0.02, 16, 48);
    const rimRing = new THREE.Mesh(rimRingGeo, luminaireMetalMat);
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = -0.03;
    dishHousingGroup.add(rimRing);

    masterHeadGroup.add(dishHousingGroup);
    luminaireGroup.add(masterHeadGroup);

    // Master High-Output Surgical SpotLight
    const masterSpot = new THREE.SpotLight(0xffffff, 4.0, 24, Math.PI / 6.2, 0.35, 1.0);
    masterSpot.position.copy(headPos1);
    masterSpot.target = surgicalTarget;
    masterSpot.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      masterSpot.shadow.mapSize.width = 512;
      masterSpot.shadow.mapSize.height = 512;
      masterSpot.shadow.bias = -0.0005;
    }
    scene.add(masterSpot);

    // Master Translucent Volumetric Light Cone
    const dist1 = headPos1.distanceTo(surgicalTarget.position);
    const cone1Geo = new THREE.ConeGeometry(dist1 * Math.tan(Math.PI / 6.5), dist1, 24, 1, true);
    const cone1Mat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cone1Mesh = new THREE.Mesh(cone1Geo, cone1Mat);
    cone1Mesh.position.copy(headPos1).add(surgicalTarget.position).multiplyScalar(0.5);
    cone1Mesh.quaternion.copy(headQuat1);
    luminaireGroup.add(cone1Mesh);

    // ==========================================================
    // 2. SECONDARY SATELLITE LIGHTHEAD (Shadowless Opposing Vector)
    // ==========================================================
    const hubPos2 = new THREE.Vector3(0.3, 5.12, 0.2);
    const elbowPos2 = new THREE.Vector3(0.9, 5.2, -0.5);
    const headPos2 = new THREE.Vector3(1.7, 4.6, -1.1);

    luminaireGroup.add(createBoomArm(hubPos2, elbowPos2, 0.045));

    const springBox2 = new THREE.Mesh(springBoxGeo, luminaireMetalMat);
    springBox2.position.copy(elbowPos2);
    springBox2.rotation.z = -Math.PI / 4;
    luminaireGroup.add(springBox2);

    luminaireGroup.add(createBoomArm(elbowPos2, headPos2, 0.038));

    const targetVector2 = surgicalTarget.position.clone().sub(headPos2).normalize();
    const headQuat2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), targetVector2);

    const satHeadGroup = new THREE.Group();
    satHeadGroup.position.copy(headPos2);

    const yoke2Geo = new THREE.TorusGeometry(0.56, 0.028, 12, 24, Math.PI);
    const yoke2Mesh = new THREE.Mesh(yoke2Geo, luminaireMetalMat);
    yoke2Mesh.rotation.x = Math.PI / 2;
    satHeadGroup.add(yoke2Mesh);

    const satHousingGroup = new THREE.Group();
    satHousingGroup.quaternion.copy(headQuat2);

    const satDishBackGeo = new THREE.CylinderGeometry(0.50, 0.55, 0.10, 32);
    const satDishBack = new THREE.Mesh(satDishBackGeo, luminaireWhiteMat);
    satHousingGroup.add(satDishBack);

    const satFaceplateGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.02, 32);
    const satFaceplateMesh = new THREE.Mesh(satFaceplateGeo, faceplateMat);
    satFaceplateMesh.position.y = -0.06;
    satHousingGroup.add(satFaceplateMesh);

    const addSatLedRing = (radius: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const ledMesh = new THREE.Mesh(ledPodGeo, luminaireLedMat);
        ledMesh.position.set(Math.cos(angle) * radius, -0.068, Math.sin(angle) * radius);
        satHousingGroup.add(ledMesh);
      }
    };
    addSatLedRing(0.18, 6);
    addSatLedRing(0.36, 12);

    const satHandleGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.18, 16);
    const satHandleMesh = new THREE.Mesh(satHandleGeo, luminaireMetalMat);
    satHandleMesh.position.y = -0.15;
    satHousingGroup.add(satHandleMesh);

    const satRimRingGeo = new THREE.TorusGeometry(0.58, 0.018, 16, 48);
    const satRimRing = new THREE.Mesh(satRimRingGeo, luminaireMetalMat);
    satRimRing.rotation.x = Math.PI / 2;
    satRimRing.position.y = -0.02;
    satHousingGroup.add(satRimRing);

    satHeadGroup.add(satHousingGroup);
    luminaireGroup.add(satHeadGroup);

    // Satellite SpotLight (eliminates harsh surgeon/robot shadows)
    const satSpot = new THREE.SpotLight(0xf0fdf4, 3.0, 22, Math.PI / 5.8, 0.4, 1.0);
    satSpot.position.copy(headPos2);
    satSpot.target = surgicalTarget;
    scene.add(satSpot);

    // Satellite Translucent Volumetric Light Cone
    const dist2 = headPos2.distanceTo(surgicalTarget.position);
    const cone2Geo = new THREE.ConeGeometry(dist2 * Math.tan(Math.PI / 6.0), dist2, 24, 1, true);
    const cone2Mat = new THREE.MeshBasicMaterial({
      color: 0xf0fdf4,
      transparent: true,
      opacity: 0.038,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cone2Mesh = new THREE.Mesh(cone2Geo, cone2Mat);
    cone2Mesh.position.copy(headPos2).add(surgicalTarget.position).multiplyScalar(0.5);
    cone2Mesh.quaternion.copy(headQuat2);
    luminaireGroup.add(cone2Mesh);

    scene.add(luminaireGroup);

    // Theater Floor - Hospital Surgical Suite Anti-Static Flooring (y = -1.8)
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep slate surgical theater floor
      roughness: 0.5,
      metalness: 0.25,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1.8;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    // Clean clinical floor grid
    const grid = new THREE.GridHelper(26, 26, 0x10b981, 0x1e293b);
    grid.position.y = -1.792;
    scene.add(grid);

    // Demarcated Sterile Perimeter / Safety Zone Line around robot and table
    const safetyLineGeo = new THREE.RingGeometry(5.6, 5.72, 48);
    const safetyLineMat = new THREE.MeshBasicMaterial({
      color: 0x059669,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    const safetyLine = new THREE.Mesh(safetyLineGeo, safetyLineMat);
    safetyLine.rotation.x = -Math.PI / 2;
    safetyLine.position.set(0, -1.791, 0);
    scene.add(safetyLine);

    // -------------------------------------------------------------
    // SURGICAL WORKSPACE TABLE (Grounded to Operating Room Floor)
    // -------------------------------------------------------------
    const tableGroup = new THREE.Group();

    // Table Floor Contact Ambient Occlusion Shadow
    const tableShadowGeo = new THREE.PlaneGeometry(6.4, 6.4);
    const tableShadowMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.5,
    });
    const tableShadow = new THREE.Mesh(tableShadowGeo, tableShadowMat);
    tableShadow.rotation.x = -Math.PI / 2;
    tableShadow.position.set(0, -1.795, 0);
    tableGroup.add(tableShadow);

    // Heavy Floor Pedestal Foot Plate resting firmly on the floor at y = -1.8
    const tableFootGeo = new THREE.BoxGeometry(4.4, 0.08, 4.4);
    const tableFootMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.25,
    });
    const tableFoot = new THREE.Mesh(tableFootGeo, tableFootMat);
    tableFoot.position.set(0, -1.76, 0);
    tableFoot.receiveShadow = !isSoftwareGl;
    tableGroup.add(tableFoot);

    // Central Operating Table Hydraulic Column (telescoping column from y = -1.8 to table bottom)
    const tablePedestalGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.56, 24);
    const tablePedestalMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const tablePedestal = new THREE.Mesh(tablePedestalGeo, tablePedestalMat);
    tablePedestal.position.set(0, -1.48, 0);
    tablePedestal.receiveShadow = !isSoftwareGl;
    tablePedestal.castShadow = !isSoftwareGl;
    tableGroup.add(tablePedestal);

    // Sterile Surgical Operating Table Base
    const tableBaseGeo = new THREE.BoxGeometry(7.2, 0.4, 7.2);
    const tableBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e, // Surgical sterile drape teal
      roughness: 0.7,
      metalness: 0.1,
    });
    const tableBase = new THREE.Mesh(tableBaseGeo, tableBaseMat);
    tableBase.position.set(0, -1.4, 0);
    tableBase.receiveShadow = !isSoftwareGl;
    tableBase.castShadow = !isSoftwareGl;
    tableGroup.add(tableBase);

    // Surgical Phantom Cavity Table Floor (identical to Doctor View at y = -1.2)
    const cavityFloorGeo = new THREE.PlaneGeometry(6.8, 6.8);
    const cavityFloorMat = new THREE.MeshStandardMaterial({
      color: 0x182232, // Deep matte dark slate-charcoal tray (high contrast for colored specimens)
      roughness: 0.85,
      metalness: 0.08,
    });
    const cavityFloor = new THREE.Mesh(cavityFloorGeo, cavityFloorMat);
    cavityFloor.rotation.x = -Math.PI / 2;
    cavityFloor.position.y = -1.2;
    cavityFloor.receiveShadow = !isSoftwareGl;
    tableGroup.add(cavityFloor);

    // Surgical grid markings (identical grid spacing & color as Doctor View)
    const surgicalGrid = new THREE.GridHelper(6.8, 14, 0x475569, 0x334155);
    surgicalGrid.position.y = -1.19;
    tableGroup.add(surgicalGrid);

    // Sterile patient drape perimeter walls
    const drapeGeo = new THREE.BoxGeometry(7.4, 0.4, 7.4);
    const drapeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
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
    // PROCEDURAL 6-DOF ROBOTIC ARM & PATIENT SIDE CART (PSC)
    // Firmly grounded on Operating Room Floor at y = -1.8
    // -------------------------------------------------------------
    const robotGroup = new THREE.Group();
    const cartX = -2.8;
    const cartZ = -3.8;

    // A. Cart Ground Contact Ambient Occlusion Shadow (y = -1.794)
    const cartShadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const cartShadowMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.6,
    });
    const cartShadow = new THREE.Mesh(cartShadowGeo, cartShadowMat);
    cartShadow.rotation.x = -Math.PI / 2;
    cartShadow.position.set(cartX, -1.794, cartZ);
    robotGroup.add(cartShadow);

    // B. Four Heavy-Duty Dual Medical Caster Wheels (resting firmly on floor at y = -1.8)
    const casterOffsets = [
      { x: -0.95, z: -0.92, hasBrake: true },  // Rear Left
      { x: 0.95, z: -0.92, hasBrake: true },   // Rear Right
      { x: -0.95, z: 0.92, hasBrake: false },  // Front Left
      { x: 0.95, z: 0.92, hasBrake: false },   // Front Right
    ];

    const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2,
    });
    const casterHousingMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.2,
    });

    casterOffsets.forEach((pos) => {
      // Swivel housing / fork
      const housingGeo = new THREE.BoxGeometry(0.24, 0.2, 0.24);
      const housing = new THREE.Mesh(housingGeo, casterHousingMat);
      housing.position.set(cartX + pos.x, -1.58, cartZ + pos.z);
      robotGroup.add(housing);

      // Left wheel of dual caster
      const w1 = new THREE.Mesh(wheelGeo, wheelMat);
      w1.position.set(cartX + pos.x - 0.06, -1.64, cartZ + pos.z);
      robotGroup.add(w1);

      // Right wheel of dual caster
      const w2 = new THREE.Mesh(wheelGeo, wheelMat);
      w2.position.set(cartX + pos.x + 0.06, -1.64, cartZ + pos.z);
      robotGroup.add(w2);

      // Floor lock brake pedal on rear casters
      if (pos.hasBrake) {
        const brakeGeo = new THREE.BoxGeometry(0.06, 0.08, 0.14);
        const brakeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
        const brake = new THREE.Mesh(brakeGeo, brakeMat);
        brake.position.set(cartX + pos.x, -1.68, cartZ + pos.z - 0.14);
        robotGroup.add(brake);
      }
    });

    // C. Floor Stabilizer Mechanical Jacks (firmly contact floor at y = -1.8)
    const jackGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.24, 16);
    const jackMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
    const jackLeft = new THREE.Mesh(jackGeo, jackMat);
    jackLeft.position.set(cartX - 1.15, -1.68, cartZ);
    robotGroup.add(jackLeft);
    const jackRight = new THREE.Mesh(jackGeo, jackMat);
    jackRight.position.set(cartX + 1.15, -1.68, cartZ);
    robotGroup.add(jackRight);

    // D. Lower Wheeled Chassis & Anti-Collision Bumper (y = -1.50)
    const lowerChassisGeo = new THREE.BoxGeometry(2.45, 0.36, 2.35);
    const lowerChassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.6,
      roughness: 0.35,
    });
    const lowerChassis = new THREE.Mesh(lowerChassisGeo, lowerChassisMat);
    lowerChassis.position.set(cartX, -1.5, cartZ);
    lowerChassis.castShadow = !isSoftwareGl;
    lowerChassis.receiveShadow = !isSoftwareGl;
    robotGroup.add(lowerChassis);

    // E. Middle Cart Enclosure (Motor, Battery & Power Distribution Bay)
    const midBodyGeo = new THREE.BoxGeometry(2.1, 0.96, 2.0);
    const midBodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // da Vinci clinical white composite
      metalness: 0.3,
      roughness: 0.2,
    });
    const midBody = new THREE.Mesh(midBodyGeo, midBodyMat);
    midBody.position.set(cartX, -0.85, cartZ);
    midBody.castShadow = !isSoftwareGl;
    midBody.receiveShadow = !isSoftwareGl;
    robotGroup.add(midBody);

    // Clinical Emerald Accent Stripe around cart body
    const stripeGeo = new THREE.BoxGeometry(2.12, 0.08, 2.02);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x059669 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(cartX, -0.85, cartZ);
    robotGroup.add(stripe);

    // Lower Cooling Ventilation Louvers
    const louverGeo = new THREE.BoxGeometry(1.6, 0.32, 0.02);
    const louverMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const louverFront = new THREE.Mesh(louverGeo, louverMat);
    louverFront.position.set(cartX, -1.05, cartZ + 1.01);
    robotGroup.add(louverFront);

    // Rear Steering Push Handles (for circulating nurse OR transport)
    const handleBarGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 16);
    handleBarGeo.rotateZ(Math.PI / 2);
    const handleBarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const handleBar = new THREE.Mesh(handleBarGeo, handleBarMat);
    handleBar.position.set(cartX, -0.55, cartZ - 1.15);
    robotGroup.add(handleBar);

    // Emergency Stop (E-Stop) Mushroom Button
    const estopGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16);
    const estopMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
    const estop = new THREE.Mesh(estopGeo, estopMat);
    estop.position.set(cartX + 0.8, -0.34, cartZ + 0.7);
    robotGroup.add(estop);

    // F. Upper Tapered Pedestal Collar & Circular LED Status Ring
    const collarGeo = new THREE.CylinderGeometry(0.65, 1.35, 0.75, 32);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.4,
      roughness: 0.25,
    });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(cartX, 0.0, cartZ);
    collar.castShadow = !isSoftwareGl;
    robotGroup.add(collar);

    // Circular Emerald LED Status Ring
    const statusRingGeo = new THREE.TorusGeometry(0.75, 0.04, 16, 32);
    statusRingGeo.rotateX(Math.PI / 2);
    const statusRingMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const statusRing = new THREE.Mesh(statusRingGeo, statusRingMat);
    statusRing.position.set(cartX, 0.36, cartZ);
    robotGroup.add(statusRing);

    // G. Vertical Setup Column (Boom Mast, seamless from collar up to turret at y = 3.7)
    const columnGeo = new THREE.CylinderGeometry(0.40, 0.46, 3.3, 24);
    const columnMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.5,
      roughness: 0.25,
    });
    const column = new THREE.Mesh(columnGeo, columnMat);
    column.position.set(cartX, 2.05, cartZ);
    column.castShadow = !isSoftwareGl;
    robotGroup.add(column);

    // Medical Emerald LED column channel strip
    const ledGeo = new THREE.CylinderGeometry(0.42, 0.42, 2.7, 16, 1, true, -Math.PI / 6, Math.PI / 3);
    const ledMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
    });
    const ledStrip = new THREE.Mesh(ledGeo, ledMat);
    ledStrip.position.copy(column.position);
    robotGroup.add(ledStrip);

    // H. Auxiliary Nurse / Tech Touchscreen Display Console
    const monitorArmGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 12);
    monitorArmGeo.rotateZ(Math.PI / 3);
    const monitorArmMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const monitorArm = new THREE.Mesh(monitorArmGeo, monitorArmMat);
    monitorArm.position.set(cartX + 0.45, 1.85, cartZ + 0.25);
    robotGroup.add(monitorArm);

    const monitorGeo = new THREE.BoxGeometry(0.04, 0.45, 0.65);
    const monitorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const monitor = new THREE.Mesh(monitorGeo, monitorMat);
    monitor.position.set(cartX + 0.72, 1.95, cartZ + 0.4);
    monitor.rotation.y = -Math.PI / 5;
    robotGroup.add(monitor);

    const screenGeo = new THREE.PlaneGeometry(0.6, 0.4);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x064e3b });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(cartX + 0.745, 1.95, cartZ + 0.4);
    screen.rotation.y = Math.PI / 2 - Math.PI / 5;
    robotGroup.add(screen);

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
      color: 0x059669,
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
      color: 0x059669,
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

    // 10. EndoWrist Distal Micro-Joint (Purple Sphere at Gripper)
    const wristBallGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const wristBallMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea, // Vivid surgical purple sphere at gripper
      emissive: 0x6b21a8,
      emissiveIntensity: 0.45,
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
    const tipBeaconMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 }); // Purple tip sphere
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
        tipBeaconMat.color.setHex(0xa855f7); // Purple beacon at gripper
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
      <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 text-white shadow-lg">
        <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
        <span className="text-xs font-bold tracking-wide text-emerald-300">ROBOT VIEW</span>
        <span className="text-[10px] text-emerald-200/70 uppercase tracking-wider font-mono">Synchronized Field</span>
      </div>

      {/* Telemetry Corner Readout */}
      <div className="absolute bottom-3 left-3 pointer-events-none bg-slate-900/90 backdrop-blur-sm border border-emerald-800/60 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-200 flex items-center gap-3 shadow-md">
        <div>
          <span className="text-emerald-400/80 font-bold">ARM TIP: </span>
          <span className="text-emerald-200 font-bold">
            X:{tipPos.x.toFixed(1)} Y:{tipPos.y.toFixed(1)} Z:{tipPos.z.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Camera View Angle Presets & Surgical Luminaire Status */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-emerald-800/50 text-[10px] font-mono text-slate-300 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-emerald-300 font-semibold">DUAL CEILING LUMINAIRES</span>
          <span className="text-slate-400">• 5700K SHADOWLESS</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-emerald-800/50 shadow-lg">
          <button
            onClick={() => applyPreset('iso')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
              activePreset === 'iso'
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Isometric View"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Iso</span>
          </button>
          <button
            onClick={() => applyPreset('side')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
              activePreset === 'side'
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Side Profile"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Side</span>
          </button>
          <button
            onClick={() => applyPreset('top')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
              activePreset === 'top'
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Top Down"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Top</span>
          </button>
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
