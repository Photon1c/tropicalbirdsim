// Main entry point for Spitball Simulator
console.log('Main loaded: starting app initialization');

import { initPhysics, stepPhysics } from './physics/physicsWorld.js';
import { createSpitball, updateSpitball, getSpitballBody, resetSpitball, setSplashEnabled } from './objects/spitball.js';
import { createCupTower, updateCups } from './objects/cupTower.js';
import { createLauncher, setSpitballBody, setLauncherPower } from './objects/launcher.js';
import { initControls, getParams } from './ui/controls.js';

import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';
// Remove Ammo import, use window.Ammo
// import Ammo from 'https://unpkg.com/ammo.js@0.0.10/builds/ammo.wasm.js';

let scene, camera, renderer;
let lastTime = performance.now();

async function handleReset() {
  console.log('Resetting spitball');
  await resetSpitball(getParams().spitballSize);
  setSpitballBody(getSpitballBody());
}

function handleSize(val) {
  console.log('Changing spitball size:', val);
  resetSpitball(val).then(() => setSpitballBody(getSpitballBody()));
}

function handlePower(val) {
  console.log('Changing launcher power:', val);
  setLauncherPower(val);
}

function handleSplash(val) {
  console.log('Toggling splash effect:', val);
  setSplashEnabled(val);
}

function handleStack(val) {
  console.log('Changing cup stack:', val);
  // TODO: Implement different cup stack layouts
  // For now, just reset the cup tower
  createCupTower(scene);
}

async function init() {
  console.log('Initializing scene');
  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // Camera setup
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 15);
  window.camera = camera; // For mouse world conversion in launcher
  console.log('Camera set up');

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('root').appendChild(renderer.domElement);
  console.log('Renderer set up');

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);
  console.log('Lighting set up');

  // Physics world
  console.log('Initializing physics');
  initPhysics();
  console.log('Physics initialized');

  // Ground plane (visual)
  const groundGeo = new THREE.BoxGeometry(20, 0.5, 20);
  const groundMat = new THREE.MeshPhysicalMaterial({ color: 0xcccccc, roughness: 0.8 });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.set(0, -0.25, 0);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  console.log('Ground plane added');

  // Ground plane (physics)
  console.log('Adding ground to physics world');
  const groundShape = new Ammo.btBoxShape(new Ammo.btVector3(10, 0.25, 10));
  const groundTransform = new Ammo.btTransform();
  groundTransform.setIdentity();
  groundTransform.setOrigin(new Ammo.btVector3(0, -0.25, 0));
  const groundMass = 0;
  const groundLocalInertia = new Ammo.btVector3(0, 0, 0);
  const groundMotionState = new Ammo.btDefaultMotionState(groundTransform);
  const groundRbInfo = new Ammo.btRigidBodyConstructionInfo(groundMass, groundMotionState, groundShape, groundLocalInertia);
  const groundBody = new Ammo.btRigidBody(groundRbInfo);
  import('./physics/physicsWorld.js').then(({ getPhysicsWorld }) => {
    getPhysicsWorld().addRigidBody(groundBody);
    console.log('Ground added to physics world');
  });

  // Objects
  console.log('Creating spitball');
  createSpitball(scene, getParams().spitballSize);
  setSpitballBody(getSpitballBody());
  console.log('Spitball created');
  console.log('Creating cup tower');
  createCupTower(scene);
  console.log('Cup tower created');
  console.log('Creating launcher');
  createLauncher(scene);
  console.log('Launcher created');

  // UI
  console.log('Setting up UI controls');
  initControls({
    onSize: handleSize,
    onPower: handlePower,
    onStack: handleStack,
    onReset: handleReset,
    onSplash: handleSplash,
  });
  console.log('UI controls set up');

  // Handle resize
  window.addEventListener('resize', onWindowResize);

  animate();
  console.log('Animation loop started');
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;
  stepPhysics(delta);
  updateSpitball();
  updateCups();
  renderer.render(scene, camera);
}

init(); 