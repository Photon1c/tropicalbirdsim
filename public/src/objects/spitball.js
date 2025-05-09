import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
// Ammo is a global object, do not call Ammo() or await Ammo()
import { getPhysicsWorld, addSoftBody } from '../physics/physicsWorld.js';

let spitballMesh = null;
let spitballBody = null;
let ammoSoftBodyHelpers = null;
let sceneRef = null;
let splashEnabled = true;

export function createSpitball(scene, size = 0.5) {
  sceneRef = scene;
  const physicsWorld = getPhysicsWorld();
  if (!physicsWorld) {
    console.warn('Physics world not initialized');
    return;
  }
  // Remove old spitball if exists
  if (spitballMesh) scene.remove(spitballMesh);
  if (spitballBody) physicsWorld.removeSoftBody(spitballBody);
  // Create a soft-body sphere (spitball)
  const radius = size;
  const geometry = new THREE.SphereGeometry(radius, 16, 16);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xeeeeff,
    transparent: true,
    opacity: 0.7,
    roughness: 0.3,
    metalness: 0.1,
    clearcoat: 0.7,
    clearcoatRoughness: 0.2
  });
  spitballMesh = new THREE.Mesh(geometry, material);
  spitballMesh.position.set(0, 2, 0);
  scene.add(spitballMesh);

  // Ammo.js soft body
  ammoSoftBodyHelpers = new Ammo.btSoftBodyHelpers();
  const volume = ammoSoftBodyHelpers.CreateEllipsoid(
    physicsWorld.getWorldInfo(),
    new Ammo.btVector3(0, 2, 0),
    new Ammo.btVector3(radius, radius, radius),
    128
  );
  volume.get_m_cfg().set_viterations(40);
  volume.get_m_cfg().set_piterations(40);
  volume.get_m_materials().at(0).set_m_kLST(0.9); // Linear stiffness
  volume.get_m_materials().at(0).set_m_kAST(0.9); // Area/Angular stiffness
  volume.setTotalMass(1, false);
  Ammo.castObject(volume, Ammo.btCollisionObject).getCollisionShape().setMargin(0.05);
  physicsWorld.addSoftBody(volume, 1, -1);
  spitballBody = volume;
  addSoftBody(volume);
  console.log('Spitball created (real Ammo.js soft body)');
}

export function getSpitballBody() {
  return spitballBody;
}

export function updateSpitball() {
  if (!spitballMesh || !spitballBody) return;
  // Update Three.js mesh vertices from Ammo.js soft body
  const nodes = spitballBody.get_m_nodes();
  for (let i = 0; i < spitballMesh.geometry.attributes.position.count; i++) {
    const node = nodes.at(i);
    const pos = node.get_m_x();
    spitballMesh.geometry.attributes.position.setXYZ(i, pos.x(), pos.y(), pos.z());
  }
  spitballMesh.geometry.attributes.position.needsUpdate = true;
  spitballMesh.geometry.computeVertexNormals();
}

export function resetSpitball(size = 0.5) {
  createSpitball(sceneRef, size);
}

export function setSplashEnabled(val) {
  splashEnabled = val;
}

export function showSplash(position) {
  if (!sceneRef || !splashEnabled) return;
  // Simple burst of particles
  const group = new THREE.Group();
  for (let i = 0; i < 30; i++) {
    const geo = new THREE.SphereGeometry(0.05, 8, 8);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x66ccff, transparent: true, opacity: 0.7 });
    const drop = new THREE.Mesh(geo, mat);
    drop.position.copy(position);
    // Random burst direction
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 2,
      (Math.random() - 0.5) * 2
    ).normalize().multiplyScalar(0.5 + Math.random());
    drop.userData.vel = dir;
    group.add(drop);
  }
  sceneRef.add(group);
  // Animate and remove after 1s
  let t = 0;
  function animateSplash() {
    t += 0.016;
    group.children.forEach(drop => {
      drop.position.add(drop.userData.vel);
      drop.userData.vel.multiplyScalar(0.92);
    });
    if (t < 1) requestAnimationFrame(animateSplash);
    else sceneRef.remove(group);
  }
  animateSplash();
} 