import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
// Ammo is a global object, do not call Ammo() or await Ammo()
import { getPhysicsWorld, addRigidBody } from '../physics/physicsWorld.js';

let cupMeshes = [];
let cupBodies = [];

export function createCupTower(scene) {
  const physicsWorld = getPhysicsWorld();
  if (!physicsWorld) {
    console.warn('Physics world not initialized');
    return;
  }
  // Parameters
  const cupRadius = 0.4;
  const cupHeight = 0.6;
  const rows = 3;
  cupMeshes = [];
  cupBodies = [];
  // Simple pyramid stack
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < rows - row; i++) {
      const x = (i - (rows - row - 1) / 2) * (cupRadius * 2.2);
      const y = cupHeight / 2 + row * (cupHeight * 0.95);
      const z = -3;
      // Three.js mesh
      const geometry = new THREE.CylinderGeometry(cupRadius, cupRadius * 1.1, cupHeight, 24, 1, true);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xffe4b5,
        metalness: 0.2,
        roughness: 0.6
      });
      const cup = new THREE.Mesh(geometry, material);
      cup.position.set(x, y, z);
      cup.rotation.x = Math.PI; // upside down
      scene.add(cup);
      cupMeshes.push(cup);
      // Ammo.js rigid body
      const shape = new Ammo.btCylinderShape(new Ammo.btVector3(cupRadius, cupHeight / 2, cupRadius));
      const transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin(new Ammo.btVector3(x, y, z));
      const mass = 0.2;
      const localInertia = new Ammo.btVector3(0, 0, 0);
      shape.calculateLocalInertia(mass, localInertia);
      const motionState = new Ammo.btDefaultMotionState(transform);
      const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
      const body = new Ammo.btRigidBody(rbInfo);
      physicsWorld.addRigidBody(body);
      addRigidBody(body);
      cupBodies.push(body);
    }
  }
  console.log('Cup tower created (with Ammo.js rigid bodies)');
}

export function updateCups() {
  for (let i = 0; i < cupMeshes.length; i++) {
    const mesh = cupMeshes[i];
    const body = cupBodies[i];
    if (!body) continue;
    const ms = body.getMotionState();
    if (ms) {
      const tmpTrans = new Ammo.btTransform();
      ms.getWorldTransform(tmpTrans);
      const p = tmpTrans.getOrigin();
      const q = tmpTrans.getRotation();
      mesh.position.set(p.x(), p.y(), p.z());
      mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
    }
  }
} 