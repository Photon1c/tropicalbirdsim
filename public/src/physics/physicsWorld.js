import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';
// Ammo is a global object, do not call Ammo() or await Ammo()

let physicsWorld = null;
let rigidBodies = [];
let softBodies = [];
let ammoInitialized = false;

export function initPhysics() {
  if (ammoInitialized) return;
  // Set up physics world
  const collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  const broadphase = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();
  const softBodySolver = new Ammo.btDefaultSoftBodySolver();
  physicsWorld = new Ammo.btSoftRigidDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration,
    softBodySolver
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, -9.8, 0));
  ammoInitialized = true;
  console.log('Ammo.js physics world initialized');
}

export function getPhysicsWorld() {
  return physicsWorld;
}

export function addRigidBody(body) {
  rigidBodies.push(body);
  physicsWorld.addRigidBody(body);
}

export function addSoftBody(body) {
  softBodies.push(body);
  physicsWorld.addSoftBody(body);
}

export function stepPhysics(delta) {
  if (!physicsWorld) return;
  physicsWorld.stepSimulation(delta, 10);
} 