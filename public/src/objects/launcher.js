import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { getPhysicsWorld } from '../physics/physicsWorld.js';
// Remove Ammo import, use window.Ammo
// import Ammo from 'https://unpkg.com/ammo.js@0.0.10/builds/ammo.wasm.js';
import { showSplash } from './spitball.js';
import { getParams } from '../ui/controls.js';

let launcherMesh = null;
let isDragging = false;
let dragStart = null;
let dragEnd = null;
let trajectoryLine = null;
let sceneRef = null;
let spitballBodyRef = null;
let launcherPower = 10;

export function setSpitballBody(body) {
  spitballBodyRef = body;
}

export function setLauncherPower(power) {
  launcherPower = power;
}

export function createLauncher(scene) {
  sceneRef = scene;
  // Simple visual: a straw (cylinder)
  const geometry = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 16);
  const material = new THREE.MeshPhysicalMaterial({ color: 0x8888ff, metalness: 0.3, roughness: 0.4 });
  launcherMesh = new THREE.Mesh(geometry, material);
  launcherMesh.position.set(0, 1, 6);
  launcherMesh.rotation.x = Math.PI / 2;
  scene.add(launcherMesh);

  // Trajectory preview line
  const points = [new THREE.Vector3(), new THREE.Vector3()];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
  trajectoryLine = new THREE.Line(lineGeometry, lineMaterial);
  scene.add(trajectoryLine);
  trajectoryLine.visible = false;

  // Mouse events
  const dom = document.getElementById('root');
  dom.addEventListener('mousedown', onMouseDown);
  dom.addEventListener('mousemove', onMouseMove);
  dom.addEventListener('mouseup', onMouseUp);
  console.log('Launcher created with mouse interaction');
}

function getMouseWorldPos(event) {
  // Convert mouse event to world coordinates on a fixed plane (z=6)
  const rect = event.target.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  const vector = new THREE.Vector3(x, y, 0.5);
  vector.unproject(window.camera); // camera is global in main.js
  // Intersect with z=6 plane
  const dir = vector.sub(window.camera.position).normalize();
  const distance = (6 - window.camera.position.z) / dir.z;
  return window.camera.position.clone().add(dir.multiplyScalar(distance));
}

function onMouseDown(event) {
  isDragging = true;
  dragStart = getMouseWorldPos(event);
  dragEnd = dragStart.clone();
  trajectoryLine.visible = true;
}

function onMouseMove(event) {
  if (!isDragging) return;
  dragEnd = getMouseWorldPos(event);
  // Update trajectory preview
  trajectoryLine.geometry.setFromPoints([dragStart, dragEnd]);
}

function onMouseUp(event) {
  if (!isDragging) return;
  isDragging = false;
  trajectoryLine.visible = false;
  dragEnd = getMouseWorldPos(event);
  // Calculate launch direction and power
  const launchVec = new THREE.Vector3().subVectors(dragEnd, dragStart);
  if (launchVec.length() < 0.1) return; // too short
  launchSpitball(launchVec.multiplyScalar(launcherPower / 2));
}

function launchSpitball(impulseVec) {
  if (!spitballBodyRef) return;
  // Apply impulse to Ammo.js soft body
  const nodes = spitballBodyRef.get_m_nodes();
  for (let i = 0; i < nodes.size(); i++) {
    const node = nodes.at(i);
    node.m_v.setValue(impulseVec.x, impulseVec.y, impulseVec.z);
  }
  // Splash effect at launch
  showSplash(new THREE.Vector3(0, 1, 6));
} 