import * as THREE from "https://unpkg.com/three@0.126.1/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js";
import { Curves } from 'https://unpkg.com/three@0.126.1/examples/jsm/curves/CurveExtras.js';
import { Geometry } from 'https://unpkg.com/three@0.126.1/examples/jsm/deprecated/Geometry.js';
import { PointerLockControls } from "https://unpkg.com/three@0.126.1/examples/jsm/controls/PointerLockControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.126.1/examples/jsm/loaders/GLTFLoader.js";
import { ConvexObjectBreaker } from "https://unpkg.com/three@0.126.1/examples/jsm/misc/ConvexObjectBreaker.js";
import { ConvexGeometry } from "https://unpkg.com/three@0.126.1/examples/jsm/geometries/ConvexGeometry.js";
import * as BufferGeometryUtils from 'https://unpkg.com/three@0.126.1/examples/jsm/utils/BufferGeometryUtils.js';
import { GUI } from "https://unpkg.com/three@0.126.1/examples/jsm/libs/dat.gui.module.js";
import Stats from "https://unpkg.com/three@0.126.1/examples/jsm/libs/stats.module.js";
import SimplexNoise from "https://cdn.skypack.dev/simplex-noise@2.4.0";
import { SimplifyModifier } from 'https://unpkg.com/three@0.126.1/examples/jsm/modifiers/SimplifyModifier.js';
import { RGBELoader } from 'https://unpkg.com/three@0.126.1/examples/jsm/loaders/RGBELoader.js';
// Modular objects
import { createSpitball, updateSpitball } from '../objects/spitball.js';
import { createCupTower, updateCups } from '../objects/cupTower.js';
import { createLauncher } from '../objects/launcher.js';

	let keyStates = {};
  let box;
  
  

// Graphics variables
			let container, stats;
			let camera, controls, scene, renderer;
			let orbitControls, pointerLockControls;
			const clock = new THREE.Clock();
			let clickRequest = false;
			const mouseCoords = new THREE.Vector2();
			const raycaster = new THREE.Raycaster();
			const ballMaterial = new THREE.MeshPhongMaterial( { color: 0x202020 } );
			const pos = new THREE.Vector3();
			const quat = new THREE.Quaternion();

			// Physics variables
			const gravityConstant = - 9.8;
			let physicsWorld;
			const rigidBodies = [];
			const softBodies = [];
			const margin = 0.05;
			let transformAux1;
			let softBodyHelpers;


let loader = new GLTFLoader();
let mixer;
let mesh;

let textureLoader = new THREE.TextureLoader();

let birdFlock = [];
let birdMixers = [];
const NUM_BIRDS = 10;
const BIRD_SCALE = 0.05; // 0.5 of current 0.1
const BIRD_ALTITUDE = 8;
const BIRD_RADIUS = 10;
let birdGLTF = null;

let isFPS = false;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const moveSpeed = 0.15;
const jumpSpeed = 0.25;
const gravity = 0.01;
let prevTime = performance.now();
const simplex = new SimplexNoise();

const fixedEyeHeight = 2.0; // Define eye height for FPS walk

// Add collision handler constants for bird physics
const COLLISION_GROUP_SPITBALL = 1;
const COLLISION_GROUP_BIRDS = 2;
const COLLISION_GROUP_DEFAULT = 4;

// Adding reliable collision detection system
let collisionConfiguration;
let dispatcher;
let birdsHit = new Set();
let failedBirds = new Set(); // Track birds that failed to transform

// Simplify collision detection but keep key improvements
const BIRD_COLLISION_THRESHOLD = 0.5; // Increased for better detection

// Improved FPS control constants
const MOVE_SPEED = 0.5; // Increased from 0.2 for better movement
const JUMP_SPEED = 0.3;
const GRAVITY_CONSTANT = 0.01;
const GROUND_PLANE_Y = -0.5; // Y position of the ground plane

// Terrain and environment constants
const TERRAIN_SIZE = 50;
const TERRAIN_SEGMENTS = 128;
const TERRAIN_HEIGHT_SCALE = 2.5;
const TERRAIN_TEXTURE_REPEAT = 16;
const NUM_TREES = 20;
const NUM_SHRUBS = 30;
const NUM_HOUSES = 5;

// Create temporary Ammo.js vectors for physics calculations - moved to the top level so they're initialized before use
let tmpBtVec3_1, tmpBtVec3_2, tmpBtVec3_3;

			Ammo().then( function ( AmmoLib ) {

				Ammo = AmmoLib;

				// Wait for DOM to be fully loaded before initializing
				if (document.readyState === 'loading') {
					document.addEventListener('DOMContentLoaded', function() {
						init();
						animate();
					});
				} else {
					// DOM already loaded
					init();
					animate();
				}

			} );

			function init() {
				// Create container first
				container = document.createElement( 'div' );
				document.body.appendChild( container );

				// Then initialize graphics
				initGraphics();
				initPhysics();
				createObjects();
				initInput();
			}

			function initGraphics() {
				camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 2000 );

				scene = new THREE.Scene();
				scene.background = new THREE.Color( 0xbfd1e5 );

				// First set camera position
				camera.position.set(-1.2, 3, 33.61); // Significantly lowered Y from 18 to 3 for a lower view
				camera.lookAt(0, 0, 0);
				camera.updateProjectionMatrix();
				
				// Then create renderer with specific options for compatibility
				try {
					renderer = new THREE.WebGLRenderer({
						antialias: true,
						alpha: true,
						powerPreference: 'default',
						failIfMajorPerformanceCaveat: false
					});
					renderer.setPixelRatio( window.devicePixelRatio );
					renderer.setSize( window.innerWidth, window.innerHeight );
					renderer.shadowMap.enabled = true;
					container.appendChild( renderer.domElement );
					
					console.log("WebGL renderer created successfully");
				} catch (error) {
					console.error("Error creating WebGL renderer:", error);
					
					// Create fallback message
					const fallbackElement = document.createElement('div');
					fallbackElement.style.position = 'absolute';
					fallbackElement.style.top = '50%';
					fallbackElement.style.left = '50%';
					fallbackElement.style.transform = 'translate(-50%, -50%)';
					fallbackElement.style.color = 'white';
					fallbackElement.style.fontSize = '24px';
					fallbackElement.style.textAlign = 'center';
					fallbackElement.innerHTML = `
						<h2>WebGL Not Available</h2>
						<p>Your browser or device doesn't support WebGL, which is required for this application.</p>
						<p>Try using a different browser or updating your graphics drivers.</p>
					`;
					container.appendChild(fallbackElement);
					
					// Return early to avoid further errors
					return;
				}

				// OrbitControls (default)
				orbitControls = new OrbitControls(camera, renderer.domElement);
				orbitControls.target.set(0, 0, 0);
				orbitControls.update(); // Force update of controls
				controls = orbitControls;
				
				// PointerLockControls (FPS)
				pointerLockControls = new PointerLockControls(camera, renderer.domElement);
				pointerLockControls.getObject().position.y = 2;

				// Force initial render to show scene without requiring user interaction
				renderer.render(scene, camera);
				
				// Add UI elements - title and instructions
				addUIElements();
				
				// Toggle controls - RESTORED
				document.addEventListener('keydown', function (event) {
					if (event.code === 'KeyF' && event.shiftKey) { // Add shift key to distinguish from firing
						isFPS = true;
						controls = pointerLockControls;
						pointerLockControls.lock();
					}
					
					// Log camera position when M is pressed
					if (event.code === 'KeyM') {
						const position = isFPS ? pointerLockControls.getObject().position : camera.position;
						console.log('Camera position:', {
							x: parseFloat(position.x.toFixed(2)),
							y: parseFloat(position.y.toFixed(2)),
							z: parseFloat(position.z.toFixed(2))
						});
						// Also log camera look target or direction
						if (isFPS) {
							const direction = new THREE.Vector3();
							camera.getWorldDirection(direction);
							console.log('Camera direction:', {
								x: parseFloat(direction.x.toFixed(2)),
								y: parseFloat(direction.y.toFixed(2)),
								z: parseFloat(direction.z.toFixed(2))
							});
						} else {
							console.log('Orbit controls target:', {
								x: parseFloat(orbitControls.target.x.toFixed(2)),
								y: parseFloat(orbitControls.target.y.toFixed(2)),
								z: parseFloat(orbitControls.target.z.toFixed(2))
							});
						}
					}
					
					if (isFPS) {
						switch (event.code) {
							case 'ArrowUp': case 'KeyW': moveForward = true; break;
							case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
							case 'ArrowDown': case 'KeyS': moveBackward = true; break;
							case 'ArrowRight': case 'KeyD': moveRight = true; break;
							case 'Space': if (canJump) { velocity.y += jumpSpeed; canJump = false; } break;
						}
					}
				});
				document.addEventListener('keyup', function (event) {
					if (isFPS) {
						switch (event.code) {
							case 'ArrowUp': case 'KeyW': moveForward = false; break;
							case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
							case 'ArrowDown': case 'KeyS': moveBackward = false; break;
							case 'ArrowRight': case 'KeyD': moveRight = false; break;
						}
					}
				});
				pointerLockControls.addEventListener('lock', function () { isFPS = true; controls = pointerLockControls; });
				pointerLockControls.addEventListener('unlock', function () { isFPS = false; controls = orbitControls; });
				
				const ambientLight = new THREE.AmbientLight( 0x404040 );
				scene.add( ambientLight );

				const light = new THREE.DirectionalLight( 0xffffff, 1 );
				light.position.set( - 10, 10, 5 );
				light.castShadow = true;
				const d = 20;
				light.shadow.camera.left = - d;
				light.shadow.camera.right = d;
				light.shadow.camera.top = d;
				light.shadow.camera.bottom = - d;
				light.shadow.camera.near = 2;
				light.shadow.camera.far = 50;
				light.shadow.mapSize.x = 1024;
				light.shadow.mapSize.y = 1024;

				scene.add( light );

				stats = new Stats();
				stats.domElement.style.position = 'absolute';
				stats.domElement.style.top = '0px';
				stats.domElement.style.right = '0px';
				stats.domElement.style.left = 'auto';
				container.appendChild( stats.domElement );
				window.addEventListener( 'resize', onWindowResize );

                // Remove debug cube
                console.log('initGraphics: Scene, camera, renderer initialized.');
			}

			function initPhysics() {
				// Physics configuration
				collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
				dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
				const broadphase = new Ammo.btDbvtBroadphase();
				const solver = new Ammo.btSequentialImpulseConstraintSolver();
				const softBodySolver = new Ammo.btDefaultSoftBodySolver();
				physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
				physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
				physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));

				transformAux1 = new Ammo.btTransform();
				softBodyHelpers = new Ammo.btSoftBodyHelpers();
				
				// Initialize the temporary vectors here
				tmpBtVec3_1 = new Ammo.btVector3(0, 0, 0);
				tmpBtVec3_2 = new Ammo.btVector3(0, 0, 0);
				tmpBtVec3_3 = new Ammo.btVector3(0, 0, 0);
				
				console.log('initPhysics: Physics world initialized.');
			}


			function createObjects() {
				// Create procedurally generated terrain
				createTerrain();

				// Ramp
				pos.set(3, 1, 0);
				quat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 30 * Math.PI / 180);
				const obstacle = createParalellepiped(10, 1, 4, 0, pos, quat, new THREE.MeshPhongMaterial({ color: 0x606060 }));
				obstacle.castShadow = true;
				obstacle.receiveShadow = true;
        
        
 
 
let ratio = 1350 / 900;
let mapDef = textureLoader.load( 'https://threejs.org/examples/textures/uv_grid_opengl.jpg' );
let mat = new THREE.MeshPhongMaterial({ map: mapDef, wireframe: true });
let mat1 = new THREE.MeshPhongMaterial({ map: mapDef, wireframe: false, side: THREE.DoubleSide });
   
let material = new THREE.MeshPhongMaterial( {color: "grey", wireframe: false, side: THREE.DoubleSide, transparent: false} );
let meshMaterial = new THREE.MeshLambertMaterial( {color: 0xffffff, wireframe: false, opacity: 0.5,transparent: true } );
 
 
 
 let a1 = 'https://threejs.org/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb';
 let a2 = 'https://cdn.devdojo.com/assets/3d/parrot.glb';
 
 new GLTFLoader().load(a2, function (gltf) {
    birdGLTF = gltf;
    let baseBird = gltf.scene.children[0];
    // Do NOT scale geometry, use mesh.scale instead
    // Create flock
    for (let i = 0; i < NUM_BIRDS; i++) {
      let birdMesh = baseBird.clone();
      birdMesh.material = baseBird.material.clone();
      birdMesh.position.set(
        Math.cos((i / NUM_BIRDS) * Math.PI * 2) * BIRD_RADIUS,
        BIRD_ALTITUDE + Math.random() * 2,
        Math.sin((i / NUM_BIRDS) * Math.PI * 2) * BIRD_RADIUS
      );
      birdMesh.scale.set(BIRD_SCALE, BIRD_SCALE, BIRD_SCALE);
      birdMesh.castShadow = true;
      birdMesh.receiveShadow = true;
      scene.add(birdMesh);
      birdFlock.push({ mesh: birdMesh, flying: true, soft: false });
      // Animation mixer if available
      if (gltf.animations && gltf.animations.length > 0) {
        let mixer = new THREE.AnimationMixer(birdMesh);
        mixer.clipAction(gltf.animations[0]).play();
        birdMixers.push(mixer);
      } else {
        birdMixers.push(null);
      }
    }
  });
    
    
 	
  

        
   

 
 
 
 
 
 // перевод геометрии в буферную:	
    function setupAttributes( geometry ) {
        const vectors = [
					new THREE.Vector3(), // new THREE.Vector3( 1, 0, 0 ),
					new THREE.Vector3(), // new THREE.Vector3( 0, 1, 0 ),
					new THREE.Vector3() // new THREE.Vector3( 0, 0, 1 )
				];
				const position = geometry.attributes.position;
				const centers = new Float32Array( position.count * 3 );

				for ( let i = 0, l = position.count; i < l; i ++ ) {
					vectors[ i % 3 ].toArray( centers, i * 3 );
				}
				geometry.setAttribute( 'center', new THREE.BufferAttribute( centers, 3 ) );
        return geometry;
			}
        


}






function createSoftVolume(bufferGeom, mass, pressure, rotation = null, material = null) {
  // This function is no longer used directly
  console.warn("createSoftVolume is deprecated, using rigid bodies instead");
  return null;
}









			function createParalellepiped( sx, sy, sz, mass, pos, quat, material ) {
				const threeObject = new THREE.Mesh( new THREE.BoxGeometry( sx, sy, sz, 1, 1, 1 ), material );
				const shape = new Ammo.btBoxShape( new Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
				shape.setMargin( margin );
				createRigidBody( threeObject, shape, mass, pos, quat );
				return threeObject;
			}




 
   
 // прослушиватели событий клавиатуры:
	keyStates = {};
	document.addEventListener( 'keydown', ( event ) => {	
		keyStates[ event.code ] = true;  
	}, false );

	document.addEventListener( 'keyup', ( event ) => {
		keyStates[ event.code ] = false;
	}, false );
  
  
	function movingfunction() { 
      // numpad 13 52  
      if ( keyStates[ 'Numpad4' ] ) {
    console.log('d')
      }
      
      if ( keyStates[ 'Numpad5' ] ) {
      }

	}





//

			function createRigidBody( threeObject, physicsShape, mass, pos, quat, group = COLLISION_GROUP_DEFAULT, mask = -1 ) {

				threeObject.position.copy( pos );
				threeObject.quaternion.copy( quat );

				const transform = new Ammo.btTransform();
				transform.setIdentity();
				transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
				transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
				const motionState = new Ammo.btDefaultMotionState( transform );

				const localInertia = new Ammo.btVector3( 0, 0, 0 );
				physicsShape.calculateLocalInertia( mass, localInertia );

				const rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
				const body = new Ammo.btRigidBody( rbInfo );

				threeObject.userData.physicsBody = body;
				body.threeObject = threeObject; // Back-reference for collision handling

				scene.add( threeObject );

				if ( mass > 0 ) {

					rigidBodies.push( threeObject );

					// Disable deactivation
					body.setActivationState( 4 );

				}
				physicsWorld.addRigidBody( body, group, mask );
				return body;
			}


			function initInput() {
				// Changed: Using F key instead of mouse click for firing
				window.addEventListener('keydown', function(event) {
					if (event.code === 'KeyF' && !clickRequest) {
						// Set fire request flag
						clickRequest = true;
					}
					
					// Added: Instructions toggle with 'i' key
					if (event.code === 'KeyI') {
						toggleInstructions();
					}
				});
			}

			function processClick() {
				if (clickRequest) {
					// For first-person mode, use camera direction
					if (isFPS) {
						const direction = new THREE.Vector3();
						camera.getWorldDirection(direction);
						
						// Create a ball and launch it in camera direction
						const ballMass = 3;
						const ballRadius = 0.05; // Scaled down projectile
						
						const ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 18, 16), ballMaterial);
						ball.castShadow = true;
						ball.receiveShadow = true;
						const ballShape = new Ammo.btSphereShape(ballRadius);
						ballShape.setMargin(margin);
						
						// Position slightly in front of camera to avoid self-collision
						pos.copy(camera.position).add(direction.multiplyScalar(1.0));
						quat.set(0, 0, 0, 1);
						const ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat, COLLISION_GROUP_SPITBALL, COLLISION_GROUP_BIRDS | COLLISION_GROUP_DEFAULT);
						
						// Mark this as a spitball for collision detection
						ball.userData.isSpitball = true;
						ballBody.setFriction(0.5);
						
						// Set velocity in camera direction
						direction.normalize().multiplyScalar(35);
						ballBody.setLinearVelocity(new Ammo.btVector3(direction.x, direction.y, direction.z));
					} 
					// For orbit camera mode, use raycaster from screen center
					else {
						// Use center of screen for consistent firing
						const screenCenter = new THREE.Vector2(0, 0);
						raycaster.setFromCamera(screenCenter, camera);
						
						// Creates a ball
						const ballMass = 3;
						const ballRadius = 0.05; // Scaled down projectile
						
						const ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 18, 16), ballMaterial);
						ball.castShadow = true;
						ball.receiveShadow = true;
						const ballShape = new Ammo.btSphereShape(ballRadius);
						ballShape.setMargin(margin);
						
						// Position at camera
						pos.copy(camera.position);
						quat.set(0, 0, 0, 1);
						const ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat, COLLISION_GROUP_SPITBALL, COLLISION_GROUP_BIRDS | COLLISION_GROUP_DEFAULT);
						
						// Mark this as a spitball for collision detection
						ball.userData.isSpitball = true;
						ballBody.setFriction(0.5);
						
						// Set velocity in raycast direction
						pos.copy(raycaster.ray.direction);
						pos.multiplyScalar(35);
						ballBody.setLinearVelocity(new Ammo.btVector3(pos.x, pos.y, pos.z));
					}
					
					clickRequest = false;
				}
			}

		

			function updatePhysics( deltaTime ) {

				// Step world
				physicsWorld.stepSimulation( deltaTime, 10 );

				// Update soft volumes
				for ( let i = 0, il = softBodies.length; i < il; i ++ ) {

					const volume = softBodies[ i ];
					const geometry = volume.geometry;
					const softBody = volume.userData.physicsBody;
          
          // Check if geometry and necessary attributes exist
          if (!geometry || !geometry.attributes.position || !softBody) {
            console.warn("Skipping soft body update due to missing data", volume);
            continue;
          }

					const volumePositions = geometry.attributes.position.array;
          let volumeNormals = null;
          if (geometry.attributes.normal) {
            volumeNormals = geometry.attributes.normal.array;
          } else {
             console.warn("Soft body geometry missing normals!", volume);
             // Optionally try to compute: geometry.computeVertexNormals(); volumeNormals = geometry.attributes.normal?.array;
          }

					// Use direct mapping: node index corresponds to vertex index
					const numVerts = geometry.attributes.position.count;
					const nodes = softBody.get_m_nodes();
          if (nodes.size() !== numVerts) {
              console.error("Mismatch between soft body nodes and geometry vertices!", nodes.size(), numVerts);
              continue; // Avoid errors if mismatch
          }

					for ( let j = 0; j < numVerts; j ++ ) {

						const node = nodes.at( j );
						const nodePos = node.get_m_x();
						volumePositions[ j * 3 ] = nodePos.x();
						volumePositions[ j * 3 + 1 ] = nodePos.y();
						volumePositions[ j * 3 + 2 ] = nodePos.z();

            if (volumeNormals) {
              const nodeNormal = node.get_m_n();
              volumeNormals[ j * 3 ] = nodeNormal.x();
              volumeNormals[ j * 3 + 1 ] = nodeNormal.y();
              volumeNormals[ j * 3 + 2 ] = nodeNormal.z();
            }
					}

					geometry.attributes.position.needsUpdate = true;
          if (volumeNormals) {
            geometry.attributes.normal.needsUpdate = true;
          }
				}

				// Update rigid bodies (but NOT the camera)
				for ( let i = 0, il = rigidBodies.length; i < il; i ++ ) {

					const objThree = rigidBodies[ i ];
					// Defensive: skip camera
					if (objThree === camera || (isFPS && controls === pointerLockControls && objThree === pointerLockControls.getObject())) continue;
					const objPhys = objThree.userData.physicsBody;
					const ms = objPhys.getMotionState();
					if (ms) {

						ms.getWorldTransform( transformAux1 );
						const p = transformAux1.getOrigin();
						const q = transformAux1.getRotation();
						
						// Check if object is out of bounds (far from center)
						const distance = Math.sqrt(p.x() * p.x() + p.z() * p.z());
						const maxDistance = TERRAIN_SIZE / 2 + 5; // Allow a small buffer beyond terrain edge
						
						if (distance > maxDistance) {
							// Object is out of bounds, move it back within bounds
							const normalized = new THREE.Vector3(p.x(), 0, p.z()).normalize();
							p.setX(normalized.x * maxDistance * 0.95); // Move it slightly inside the boundary
							p.setZ(normalized.z * maxDistance * 0.95);
							
							// Reset velocities to prevent escaping again
							const vel = objPhys.getLinearVelocity();
							vel.setX(vel.x() * 0.1); // Drastically reduce velocity
							vel.setZ(vel.z() * 0.1);
							objPhys.setLinearVelocity(vel);
							
							// Update transform
							transformAux1.setOrigin(p);
							ms.setWorldTransform(transformAux1);
						}
						
						// Enforce height constraints for birds - don't let them fall through terrain
						const isBird = birdFlock.some(b => b.physicsMesh === objThree);
						if (isBird) {
							// Find which bird this is
							const fallenBird = birdFlock.find(b => b.physicsMesh === objThree);
							if (fallenBird) {
								// Get terrain height at current position
								const terrainHeight = getTerrainHeightAt(p.x(), p.z()) || 0;
								const minHeightAboveGround = 0.2;
								
								// If below terrain height, raise it
								if (p.y() < terrainHeight + minHeightAboveGround) {
									p.setY(terrainHeight + minHeightAboveGround);
									
									// Reset vertical velocity to prevent further falling
									const vel = objPhys.getLinearVelocity();
									if (vel.y() < 0) {
										vel.setY(0);
										objPhys.setLinearVelocity(vel);
									}
									
									// Reset angular velocity to stop spinning
									const angVel = objPhys.getAngularVelocity();
									if (angVel.length() > 0.1) {
										angVel.setX(angVel.x() * 0.8);
										angVel.setY(angVel.y() * 0.8);
										angVel.setZ(angVel.z() * 0.8);
										objPhys.setAngularVelocity(angVel);
									}
									
									// Update transform
									transformAux1.setOrigin(p);
									ms.setWorldTransform(transformAux1);
								}
							}
						}
						
						// Check if object is a spitball and enforce terrain collision
						const isSpitball = objThree.userData.isSpitball;
						if (isSpitball) {
							// Get terrain height at current position
							const terrainHeight = getTerrainHeightAt(p.x(), p.z()) || 0;
							
							// If below terrain height, raise it slightly and stop movement
							if (p.y() < terrainHeight + 0.05) {
								p.setY(terrainHeight + 0.05);
								
								// Stop the ball from moving
								objPhys.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
								objPhys.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
								
								// Update transform
								transformAux1.setOrigin(p);
								ms.setWorldTransform(transformAux1);
							}
						}
						
						objThree.position.set(p.x(), p.y(), p.z());
						objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

					}
				}
			}
      
      
     function onWindowResize() {
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize( window.innerWidth, window.innerHeight );
			}

			function animate() {
				// Start animation loop immediately to ensure scene is visible
				requestAnimationFrame(animate);
				
				const time = performance.now();
				const delta = (time - prevTime) / 1000;
				prevTime = time;
				
				// Improved FPS movement
				if (isFPS && pointerLockControls.isLocked) {
					const camObject = pointerLockControls.getObject();
					
					// Create movement vector based on current camera direction
					const moveVector = new THREE.Vector3();
					
					// Get camera's forward and right vectors
					const forward = new THREE.Vector3();
					camera.getWorldDirection(forward);
					// Make forward horizontal by zeroing out Y component
					forward.y = 0;
					forward.normalize();
					
					// Calculate right vector from forward
					const right = new THREE.Vector3();
					right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
					
					// Calculate movement direction from input
					if (moveForward) moveVector.add(forward);
					if (moveBackward) moveVector.sub(forward);
					if (moveRight) moveVector.add(right);
					if (moveLeft) moveVector.sub(right);
					
					// Apply movement if there's any direction
					if (moveVector.length() > 0) {
						moveVector.normalize();
						
						// Apply movement scaled by delta time for consistent speed
						const actualMoveSpeed = MOVE_SPEED * delta * 60; // scale by 60 for frame independence
						
						// Get current position
						const currentX = camObject.position.x;
						const currentZ = camObject.position.z;
						
						// Calculate new position
						const newX = currentX + moveVector.x * actualMoveSpeed;
						const newZ = currentZ + moveVector.z * actualMoveSpeed;
						
						// Get terrain height at new position
						const terrainHeight = getTerrainHeightAt(newX, newZ);
						
						// Apply movement with terrain height consideration
						camObject.position.x = newX;
						camObject.position.z = newZ;
					}
					
					// Apply gravity and handle jumps
					velocity.y -= GRAVITY_CONSTANT;
					camObject.position.y += velocity.y;
					
					// Ground collision - now uses actual terrain height
					const terrainHeightAtPlayer = getTerrainHeightAt(camObject.position.x, camObject.position.z);
					const targetHeight = terrainHeightAtPlayer + fixedEyeHeight;
					
					if (camObject.position.y < targetHeight) {
						velocity.y = 0;
						camObject.position.y = targetHeight;
						canJump = true;
					}
				}
				
				// Update physics world
				const deltaTime = clock.getDelta();
				updatePhysics(deltaTime);
				processClick();
				
				// Optimize bird animation to prevent flickering
				const t = clock.getElapsedTime();
				for (let i = 0; i < birdFlock.length; i++) {
					let bird = birdFlock[i];
					
					// Handle normal flying birds
					if (bird.flying && bird.mesh) {
						// Smoother animation with more stable values
						let angle = (i / NUM_BIRDS) * Math.PI * 2 + t * 0.5;
						let radius = BIRD_RADIUS + Math.sin(t * 0.2 + i * 0.5) * 1.5;
						bird.mesh.position.x = Math.cos(angle) * radius;
						bird.mesh.position.z = Math.sin(angle) * radius;
						bird.mesh.position.y = BIRD_ALTITUDE + Math.sin(t * 0.7 + i) * 1.0;
						bird.mesh.rotation.y = -angle + Math.PI / 2;
						
						// Store bird index for collision detection
						bird.mesh.userData.birdIndex = i;
					}
					// Handle fallback animation for birds without rigid bodies
					else if (!bird.flying && bird.fallbackMesh) {
						bird.fallTime += deltaTime;
						const gravity = 9.8;
						const newY = bird.fallStartY - 0.5 * gravity * bird.fallTime * bird.fallTime;
						
						// Stop at ground level
						if (newY <= GROUND_PLANE_Y + 0.15) {
							bird.fallbackMesh.position.y = GROUND_PLANE_Y + 0.15;
						} else {
							bird.fallbackMesh.position.y = newY;
						}
						
						// Add some rotation for effect
						bird.fallbackMesh.rotation.x += deltaTime * 2;
						bird.fallbackMesh.rotation.z += deltaTime;
					}
					
					if (birdMixers[i]) birdMixers[i].update(deltaTime);
				}
				
				// Debug rigid bodies (add monitoring)
				debugRigidBodies();
				
				// Improved collision detection: spitballs vs birds
				detectCollisions();
				
				renderer.render(scene, camera);
				movingfunction();
				stats.update();
				updateSpitball();
				updateCups();
			}

			// Add function to prevent soft bodies from falling through the ground
			function enforceSoftBodyConstraints() {
				for (let i = 0; i < softBodies.length; i++) {
					const softBody = softBodies[i];
					if (!softBody.userData.physicsBody) continue;
					
					const sbPhysics = softBody.userData.physicsBody;
					const nodes = sbPhysics.get_m_nodes();
					const numNodes = nodes.size();
					
					// Check each node and push it above ground if needed
					let needsUpdate = false;
					for (let j = 0; j < numNodes; j++) {
						const node = nodes.at(j);
						const pos = node.get_m_x();
						
						// If node is below ground, push it up
						if (pos.y() < GROUND_PLANE_Y) {
							needsUpdate = true;
							node.get_m_x().setY(GROUND_PLANE_Y + 0.05); // Set slightly above ground
							
							// Also zero out vertical velocity to prevent bouncing
							const vel = node.get_m_v();
							if (vel.y() < 0) {
								vel.setY(0);
							}
						}
					}
					
					// If we modified nodes, update the positions in the mesh
					if (needsUpdate && softBody.geometry && softBody.geometry.attributes.position) {
						updateSoftBodyMesh(softBody);
					}
				}
			}

			// Helper to update mesh vertices from soft body nodes
			function updateSoftBodyMesh(softBody) {
				const geometry = softBody.geometry;
				const physicsBody = softBody.userData.physicsBody;
				
				if (!geometry || !geometry.attributes.position || !physicsBody) {
					return;
				}
				
				const positions = geometry.attributes.position.array;
				const nodes = physicsBody.get_m_nodes();
				const numVerts = geometry.attributes.position.count;
				
				if (nodes.size() !== numVerts) {
					return; // Skip if mismatch
				}
				
				for (let i = 0; i < numVerts; i++) {
					const node = nodes.at(i);
					const nodePos = node.get_m_x();
					positions[i * 3] = nodePos.x();
					positions[i * 3 + 1] = nodePos.y();
					positions[i * 3 + 2] = nodePos.z();
				}
				
				geometry.attributes.position.needsUpdate = true;
			}

			// Separate collision detection function for clarity
			function detectCollisions() {
				// Find all spitballs
				const spitballs = [];
				scene.traverse(obj => {
					if (obj.userData.isSpitball && obj.geometry && obj.geometry.type === 'SphereGeometry') {
						spitballs.push(obj);
					}
				});
				
				// Check each spitball against each flying bird
				for (let i = 0; i < spitballs.length; i++) {
					const spitball = spitballs[i];
					const spitballRadius = spitball.geometry.parameters ? spitball.geometry.parameters.radius : 0.05;
					
					for (let j = 0; j < birdFlock.length; j++) {
						const bird = birdFlock[j];
						// Skip already hit birds, non-flying birds, or failed birds
						if (!bird.flying || !bird.mesh || birdsHit.has(j) || failedBirds.has(j)) continue;
						
						// Calculate distance between spitball and bird
						const dist = spitball.position.distanceTo(bird.mesh.position);
						const birdRadius = (bird.mesh.geometry.boundingSphere ? 
										   bird.mesh.geometry.boundingSphere.radius : 0.5) * BIRD_SCALE;
						
						// Check for collision with increased threshold for better detection
						if (dist < birdRadius + spitballRadius + BIRD_COLLISION_THRESHOLD) {
							console.log(`Bird ${j} hit by spitball at distance ${dist}`);
							birdsHit.add(j);
							
							// Remove spitball
							scene.remove(spitball);
							if (spitball.userData.physicsBody) {
								physicsWorld.removeRigidBody(spitball.userData.physicsBody);
								const spitballIndex = rigidBodies.indexOf(spitball);
								if (spitballIndex !== -1) {
									rigidBodies.splice(spitballIndex, 1);
								}
							}
							
							// Transform bird to soft body with error recovery
							try {
								transformBirdToSoftBody(j);
							} catch (error) {
								console.error(`Failed to transform bird ${j}:`, error);
								failedBirds.add(j); // Mark as failed to avoid repeated attempts
							}
							break; // Only one bird per spitball
						}
					}
				}
			}

			// Improved bird transformation function
			function transformBirdToSoftBody(birdIndex) {
				const bird = birdFlock[birdIndex];
				if (!bird || !bird.flying || !bird.mesh) return;
				
				console.log(`Transforming bird ${birdIndex} to rigid body`);
				
				try {
					// Store bird position, rotation and geometry for reuse
					const birdPosition = new THREE.Vector3().copy(bird.mesh.position);
					const birdRotation = new THREE.Quaternion().copy(bird.mesh.quaternion);
					
					// Clone the bird mesh to maintain appearance
					const fallenBird = bird.mesh.clone();
					
					// Remove the original flying bird
					scene.remove(bird.mesh);
					bird.flying = false;
					bird.soft = true;
					
					try {
						// Get exact terrain height at bird's position
						const terrainHeight = getTerrainHeightAt(birdPosition.x, birdPosition.z) || 0;
						console.log(`Terrain height at bird position: ${terrainHeight}`);
						
						// Position the bird at the terrain height plus a small offset
						const minHeightAboveGround = 0.2;
						const visiblePosition = new THREE.Vector3(
							birdPosition.x,
							terrainHeight + minHeightAboveGround, // Position directly on terrain
							birdPosition.z
						);
      
						// Add the cloned bird to the scene
						fallenBird.position.copy(visiblePosition);
						scene.add(fallenBird);
						console.log("Added fallen bird model at position:", visiblePosition);
      
						// Create a simple physics shape - use box for better stability
						// Approximate the size of the bird for the collision shape
						const birdSize = new THREE.Vector3(0.2, 0.1, 0.2); // width, height, depth
						const shape = new Ammo.btBoxShape(new Ammo.btVector3(birdSize.x/2, birdSize.y/2, birdSize.z/2));
						shape.setMargin(0.1); // Increased margin for better collision
      
						// Create rigid body with light mass for slower fall
						const mass = 0.1; // Reduced mass to prevent falling through ground
						const body = createRigidBody(fallenBird, shape, mass, visiblePosition, birdRotation);
      
						// Add physics properties for better movement
						body.setDamping(0.9, 0.9); // Increased damping to reduce motion
						body.setRestitution(0.1); // Reduced bounce
						body.setFriction(0.9); // High friction to stop rolling
      
						// Add a slight downward impulse to settle the bird
						const impulse = new Ammo.btVector3(0, -0.2, 0);
						body.applyImpulse(impulse, new Ammo.btVector3(0, 0, 0));
      
						// Add slight random rotation
						const torque = new Ammo.btVector3(
							(Math.random() - 0.5) * 0.05,
							(Math.random() - 0.5) * 0.05,
							(Math.random() - 0.5) * 0.05
						);
						body.applyTorqueImpulse(torque);
      
						// Store reference to the mesh and physics body
						bird.physicsMesh = fallenBird;
						bird.physicsBody = body;
      
						// Store terrain height for ground checking
						bird.terrainHeight = terrainHeight;
						
						console.log("Created physics-enabled fallen bird using original model");
					} catch (error) {
						console.error("Error creating fallen bird:", error);
      
						// Fallback to simple representation if physics fails
						const fallbackGeo = new THREE.BoxGeometry(0.2, 0.1, 0.2);
						const fallbackMat = new THREE.MeshPhongMaterial({ 
							color: 0xffaa00,
							emissive: 0x331100,
						});
      
						const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
						fallbackMesh.position.copy(birdPosition);
						scene.add(fallbackMesh);
      
						// Make it fall using simple animation
						bird.fallbackMesh = fallbackMesh;
						bird.fallTime = 0;
						bird.fallStartY = birdPosition.y;
						
						// Store terrain height for ground checking
						const terrainHeight = getTerrainHeightAt(birdPosition.x, birdPosition.z) || 0;
						bird.terrainHeight = terrainHeight;
					}
				} catch (error) {
					console.error('Error handling hit bird:', error);
					failedBirds.add(birdIndex);
				}
			}

			// Function to get the exact height of terrain at a given point
			function getTerrainHeightAt(x, z) {
				// Convert world coordinates to heightmap indices
				const normalizedX = (x + TERRAIN_SIZE/2) / TERRAIN_SIZE; // 0-1 range
				const normalizedZ = (z + TERRAIN_SIZE/2) / TERRAIN_SIZE; // 0-1 range
				
				// Ensure we're within terrain bounds
				if (normalizedX < 0 || normalizedX > 1 || normalizedZ < 0 || normalizedZ > 1) {
					return 0; // Default height for outside terrain
				}
				
				// Get heightmap indices with bilinear interpolation for smoother values
				const hmX = normalizedX * (TERRAIN_SEGMENTS - 1);
				const hmZ = normalizedZ * (TERRAIN_SEGMENTS - 1);
				
				// Get the four surrounding heights
				const x1 = Math.floor(hmX);
				const x2 = Math.min(x1 + 1, TERRAIN_SEGMENTS - 1);
				const z1 = Math.floor(hmZ);
				const z2 = Math.min(z1 + 1, TERRAIN_SEGMENTS - 1);
				
				// Get heights from the corners
				let h11, h12, h21, h22;
				
				// Get height from heightmap - access it from our stored data
				if (window.terrainHeightmap) {
					h11 = window.terrainHeightmap[z1][x1] * TERRAIN_HEIGHT_SCALE;
					h12 = window.terrainHeightmap[z2][x1] * TERRAIN_HEIGHT_SCALE;
					h21 = window.terrainHeightmap[z1][x2] * TERRAIN_HEIGHT_SCALE;
					h22 = window.terrainHeightmap[z2][x2] * TERRAIN_HEIGHT_SCALE;
					
					// Interpolation factors
					const tx = hmX - x1;
					const tz = hmZ - z1;
					
					// Bilinear interpolation
					const h1 = h11 * (1 - tx) + h21 * tx;
					const h2 = h12 * (1 - tx) + h22 * tx;
					const finalHeight = h1 * (1 - tz) + h2 * tz;
					
					return finalHeight;
				}
				
				// Fallback to raycasting method if no stored heightmap
				const raycaster = new THREE.Raycaster();
				const rayStart = new THREE.Vector3(x, 50, z); // Start high above the terrain
				const rayDir = new THREE.Vector3(0, -1, 0); // Cast downward
				raycaster.set(rayStart, rayDir);
				
				// Find intersections with terrain only (not birds or other objects)
				const intersects = raycaster.intersectObjects(scene.children, false)
					.filter(hit => {
						// Skip if the hit object is a bird or not part of terrain
						const isBird = birdFlock.some(b => 
							b.mesh === hit.object || 
							b.physicsMesh === hit.object ||
							b.fallbackMesh === hit.object
						);
						return !isBird;
					});
				
				if (intersects.length > 0) {
					return intersects[0].point.y;
				}
				
				// Default to zero if no hit
				return 0;
			}

			// Add function to monitor and debug rigid bodies
			function debugRigidBodies() {
				// Count visible objects
				let visibleCount = 0;
				
				// Check all rigid bodies
				for (let i = 0; i < rigidBodies.length; i++) {
					const obj = rigidBodies[i];
					if (obj.visible) {
						visibleCount++;
						
						// Debug position
						if (obj.position.y < -10) {
							// Object fell too far, bring it back up
							console.warn("Object fell too far:", obj.position.y);
							obj.position.y = GROUND_PLANE_Y + 0.5;
							
							// Also reset physics body
							if (obj.userData.physicsBody) {
								const transform = new Ammo.btTransform();
								transform.setIdentity();
								transform.setOrigin(new Ammo.btVector3(obj.position.x, obj.position.y, obj.position.z));
								obj.userData.physicsBody.getMotionState().setWorldTransform(transform);
								
								// Reset velocity and forces
								obj.userData.physicsBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
								obj.userData.physicsBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
								obj.userData.physicsBody.clearForces();
							}
						}
					}
				}
				
				// Log visible count periodically
				if (Math.floor(clock.getElapsedTime()) % 5 === 0) {
					console.log(`Visible rigid bodies: ${visibleCount}`);
				}
			}

			function render() {
				const deltaTime = clock.getDelta();
				updatePhysics( deltaTime );
				processClick();
				renderer.render( scene, camera );
			}

// Create procedural terrain with vegetation and buildings
function createTerrain() {
  console.log("Creating procedural terrain...");
  
  // Generate heightmap using simplex noise
  const heightmap = generateHeightmap(TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  
  // Create terrain geometry
  const geometry = new THREE.PlaneGeometry(
    TERRAIN_SIZE, 
    TERRAIN_SIZE, 
    TERRAIN_SEGMENTS - 1, 
    TERRAIN_SEGMENTS - 1
  );
  geometry.rotateX(-Math.PI / 2); // Make it horizontal
  
  // Apply heightmap to geometry
  const vertices = geometry.attributes.position.array;
  for (let i = 0; i < vertices.length; i += 3) {
    const x = Math.floor((i / 3) % TERRAIN_SEGMENTS);
    const z = Math.floor((i / 3) / TERRAIN_SEGMENTS);
    vertices[i + 1] = heightmap[z][x] * TERRAIN_HEIGHT_SCALE;
  }
  
  // Update geometry after height modification
  geometry.computeVertexNormals();
  
  // Create terrain material with grass texture
  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x4CAF50, // Green base color
    roughness: 0.8,
    metalness: 0.1,
  });
  
  // Use a more reliable texture URL
  const textureURLs = [
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/terrain/grasslight-big.jpg',
    'https://unpkg.com/three@0.126.1/examples/textures/terrain/grasslight-big.jpg',
    'https://threejs.org/examples/textures/terrain/grasslight-big.jpg'
  ];
  
  // Try to load the first texture, with fallbacks
  loadTextureWithFallbacks(textureURLs, 0, function(texture) {
    if (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(TERRAIN_TEXTURE_REPEAT, TERRAIN_TEXTURE_REPEAT);
      terrainMaterial.map = texture;
      terrainMaterial.needsUpdate = true;
      console.log("Terrain texture loaded successfully");
    } else {
      // If all textures fail, use a procedural texture
      console.log("Using procedural terrain texture");
      createProceduralTerrainTexture(terrainMaterial);
    }
  });
  
  // Create terrain mesh
  const terrain = new THREE.Mesh(geometry, terrainMaterial);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  scene.add(terrain);
  
  // Create physics for terrain with simpler collision
  createSimpleTerrainPhysics(geometry);
  
  // Add vegetation and buildings
  addTrees(heightmap);
  addShrubs(heightmap);
  addHouses(heightmap);
  
  console.log("Terrain creation complete");
}

// Helper to try multiple texture URLs
function loadTextureWithFallbacks(urls, index, callback) {
  if (index >= urls.length) {
    callback(null); // All URLs failed
    return;
  }
  
  const url = urls[index];
  console.log("Trying to load texture:", url);
  
  textureLoader.load(
    url,
    // Success
    function(texture) {
      callback(texture);
    },
    // Progress
    undefined,
    // Error, try next URL
    function() {
      console.log("Texture load failed, trying next URL...");
      loadTextureWithFallbacks(urls, index + 1, callback);
    }
  );
}

// Create a procedural texture for the terrain if all URLs fail
function createProceduralTerrainTexture(material) {
  // Create a canvas for the procedural texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Fill with base green
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some variation
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = 1 + Math.random() * 2;
    
    ctx.fillStyle = Math.random() > 0.5 ? '#388E3C' : '#81C784';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Create stripes for grass-like effect
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const width = 1 + Math.random() * 2;
    const height = 5 + Math.random() * 15;
    
    ctx.fillStyle = '#81C784';
    ctx.fillRect(x, y, width, height);
  }
  
  // Convert to texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(TERRAIN_TEXTURE_REPEAT, TERRAIN_TEXTURE_REPEAT);
  
  // Apply to material
  material.map = texture;
  material.needsUpdate = true;
}

// Simplified terrain physics - improved to better handle collisions
function createSimpleTerrainPhysics(geometry) {
  // Create a heightfield terrain shape instead of a flat box
  const vertices = geometry.attributes.position.array;
  const width = TERRAIN_SEGMENTS;
  const length = TERRAIN_SEGMENTS;
  
  // Extract heightfield data from the geometry
  const heightData = new Float32Array(width * length);
  for (let i = 0; i < width * length; i++) {
    // Get the y value (height) from vertices
    const vertexIndex = i * 3 + 1; // Y is at index 1 (X,Y,Z)
    heightData[i] = vertices[vertexIndex];
  }
  
  // Create Ammo.js heightfield terrain
  const heightScale = 1;
  const minHeight = Math.min(...heightData);
  const maxHeight = Math.max(...heightData);
  const heightStickWidth = TERRAIN_SIZE / (width - 1);
  const heightStickLength = TERRAIN_SIZE / (length - 1);
  
  // Create heightfield shape
  const heightFieldShape = new Ammo.btHeightfieldTerrainShape(
    width,
    length,
    heightData,
    heightScale,
    minHeight,
    maxHeight,
    1, // Up axis (Y)
    false // Flip quad edges
  );
  
  // Set local scaling for the terrain shape
  const scaleX = heightStickWidth;
  const scaleZ = heightStickLength;
  heightFieldShape.setLocalScaling(new Ammo.btVector3(scaleX, 1, scaleZ));
  
  // Set margin for better collision detection
  heightFieldShape.setMargin(0.1);
  
  // Calculate terrain position
  const terrainPos = new THREE.Vector3(
    -TERRAIN_SIZE / 2,
    (minHeight + maxHeight) / 2, // Center y position
    -TERRAIN_SIZE / 2
  );
  
  // Create rigid body
  const terrainTransform = new Ammo.btTransform();
  terrainTransform.setIdentity();
  terrainTransform.setOrigin(new Ammo.btVector3(terrainPos.x, terrainPos.y, terrainPos.z));
  
  const groundMass = 0; // Zero mass makes it static
  const groundLocalInertia = new Ammo.btVector3(0, 0, 0);
  
  const groundMotionState = new Ammo.btDefaultMotionState(terrainTransform);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    groundMass, groundMotionState, heightFieldShape, groundLocalInertia
  );
  
  const groundBody = new Ammo.btRigidBody(rbInfo);
  groundBody.setRestitution(0.2); // Lower restitution to reduce bounce
  groundBody.setFriction(0.9); // Higher friction to stop sliding
  
  // Set collision flags to ensure proper interaction
  groundBody.setCollisionFlags(groundBody.getCollisionFlags() | 1); // 1 = static object flag
  
  physicsWorld.addRigidBody(groundBody);
  console.log("Added terrain physics with heightfield shape");
}

// Generate terrain heightmap using simplex noise
function generateHeightmap(width, height) {
  const heightmap = [];
  const scale = 0.07; // Scale of noise
  const octaves = 6;  // Number of noise layers
  const persistence = 0.5; // How much each octave contributes
  const lacunarity = 2.0; // How frequency increases each octave
  
  for (let z = 0; z < height; z++) {
    heightmap[z] = [];
    for (let x = 0; x < width; x++) {
      let amplitude = 1.0;
      let frequency = 1.0;
      let noiseHeight = 0;
      
      // Generate multiple octaves of noise
      for (let o = 0; o < octaves; o++) {
        // Center coordinates for better distribution
        const sampleX = (x - width/2) * scale * frequency;
        const sampleZ = (z - height/2) * scale * frequency;
        
        // Add noise value from this octave
        noiseHeight += simplex.noise2D(sampleX, sampleZ) * amplitude;
        
        // Update for next octave
        amplitude *= persistence;
        frequency *= lacunarity;
      }
      
      // Normalize to 0-1 range and store
      heightmap[z][x] = (noiseHeight + 1) * 0.5;
      
      // Flatten center area for better gameplay
      const distFromCenter = Math.sqrt(Math.pow(x - width/2, 2) + Math.pow(z - height/2, 2));
      const flattenRadius = width * 0.15;
      if (distFromCenter < flattenRadius) {
        const flattenStrength = 1.0 - (distFromCenter / flattenRadius);
        heightmap[z][x] = heightmap[z][x] * (1 - flattenStrength) + 0.4 * flattenStrength;
      }
    }
  }
  
  // Store heightmap globally for other functions to use
  window.terrainHeightmap = heightmap;
  
  return heightmap;
}

// Helper to generate indices for non-indexed geometry
function generateIndices(width, height) {
  const indices = [];
  for (let z = 0; z < height - 1; z++) {
    for (let x = 0; x < width - 1; x++) {
      const tl = z * width + x;
      const tr = z * width + x + 1;
      const bl = (z + 1) * width + x;
      const br = (z + 1) * width + x + 1;
      
      // First triangle
      indices.push(tl);
      indices.push(bl);
      indices.push(tr);
      
      // Second triangle
      indices.push(tr);
      indices.push(bl);
      indices.push(br);
    }
  }
  return indices;
}

// Add trees to the terrain
function addTrees(heightmap) {
  // Load tree model or create tree geometry
  const treeGeometry = new THREE.CylinderGeometry(0, 0.5, 2, 6);
  const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
  
  const treeMaterial = new THREE.MeshPhongMaterial({ color: 0x2E7D32 });
  const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x795548 });
  
  for (let i = 0; i < NUM_TREES; i++) {
    // Find suitable position for tree (avoid center area for gameplay)
    let x, z, height;
    do {
      x = Math.random() * TERRAIN_SIZE - TERRAIN_SIZE/2;
      z = Math.random() * TERRAIN_SIZE - TERRAIN_SIZE/2;
      
      // Convert world coordinates to heightmap indices
      const hx = Math.floor(((x + TERRAIN_SIZE/2) / TERRAIN_SIZE) * (TERRAIN_SEGMENTS - 1));
      const hz = Math.floor(((z + TERRAIN_SIZE/2) / TERRAIN_SIZE) * (TERRAIN_SEGMENTS - 1));
      
      // Get height at this position
      height = heightmap[hz][hx] * TERRAIN_HEIGHT_SCALE;
      
      // Ensure we're not in center gameplay area
      const distFromCenter = Math.sqrt(x*x + z*z);
    } while (Math.sqrt(x*x + z*z) < 10);
    
    // Create tree top
    const treeTop = new THREE.Mesh(treeGeometry, treeMaterial);
    treeTop.position.set(x, height + 1.5, z);
    treeTop.castShadow = true;
    treeTop.receiveShadow = true;
    
    // Create trunk
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, height + 0.5, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    
    scene.add(treeTop);
    scene.add(trunk);
    
    // Add simple physics for trunk as static cylinder
    const shape = new Ammo.btCylinderShape(new Ammo.btVector3(0.15, 0.5, 0.15));
    const mass = 0; // Static object
    const pos = new THREE.Vector3(x, height + 0.5, z);
    const quat = new THREE.Quaternion();
    createRigidBody(trunk, shape, mass, pos, quat);
  }
}

// Add shrubs to terrain
function addShrubs(heightmap) {
  const shrubGeometry = new THREE.SphereGeometry(0.3, 8, 8);
  const shrubMaterial = new THREE.MeshPhongMaterial({ color: 0x4CAF50 });
  
  for (let i = 0; i < NUM_SHRUBS; i++) {
    // Find position for shrub
    const x = Math.random() * TERRAIN_SIZE - TERRAIN_SIZE/2;
    const z = Math.random() * TERRAIN_SIZE - TERRAIN_SIZE/2;
    
    // Get height at this position
    const hx = Math.floor(((x + TERRAIN_SIZE/2) / TERRAIN_SIZE) * (TERRAIN_SEGMENTS - 1));
    const hz = Math.floor(((z + TERRAIN_SIZE/2) / TERRAIN_SIZE) * (TERRAIN_SEGMENTS - 1));
    const height = heightmap[hz][hx] * TERRAIN_HEIGHT_SCALE;
    
    // Create shrub
    const shrub = new THREE.Mesh(shrubGeometry, shrubMaterial);
    shrub.position.set(x, height + 0.15, z);
    shrub.scale.set(1, 0.7, 1); // Flatten slightly
    shrub.castShadow = true;
    shrub.receiveShadow = true;
    
    scene.add(shrub);
  }
}

// Add houses to terrain
function addHouses(heightmap) {
  for (let i = 0; i < NUM_HOUSES; i++) {
    // Find a flat-ish area for house
    let x, z, height;
    let validPosition = false;
				
    // Try to find a relatively flat area away from center
    for (let attempts = 0; attempts < 20 && !validPosition; attempts++) {
      x = Math.random() * TERRAIN_SIZE - TERRAIN_SIZE/2;
      z = Math.random() * TERRAIN_SIZE - TERRAIN_SIZE/2;
      
      // Avoid center area
      if (Math.sqrt(x*x + z*z) < 15) continue;
						
      // Get height and check surrounding heights
      const hx = Math.floor(((x + TERRAIN_SIZE/2) / TERRAIN_SIZE) * (TERRAIN_SEGMENTS - 1));
      const hz = Math.floor(((z + TERRAIN_SIZE/2) / TERRAIN_SIZE) * (TERRAIN_SEGMENTS - 1));
						
      height = heightmap[hz][hx] * TERRAIN_HEIGHT_SCALE;
      validPosition = true;
    }
    
    if (!validPosition) continue;
    
    // Create house
    createHouse(x, height, z);
  }
}

// Create a simple house with physics
function createHouse(x, y, z) {
  // House base
  const baseWidth = 2 + Math.random();
  const baseDepth = 2 + Math.random();
  const baseHeight = 1.5 + Math.random() * 0.5;
  
  // Create house components
  const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
  const roofGeometry = new THREE.ConeGeometry(Math.max(baseWidth, baseDepth) * 0.7, 1, 4);
  
  // House materials
  const wallMaterial = new THREE.MeshPhongMaterial({ color: Math.random() > 0.5 ? 0xE0E0E0 : 0xFFECB3 });
  const roofMaterial = new THREE.MeshPhongMaterial({ color: 0xC62828 });
  
  // Create house base
  const base = new THREE.Mesh(baseGeometry, wallMaterial);
  base.position.set(x, y + baseHeight/2, z);
  base.castShadow = true;
  base.receiveShadow = true;
  
  // Create roof
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.set(x, y + baseHeight + 0.5, z);
  roof.rotation.y = Math.PI / 4; // Rotate 45 degrees
  roof.castShadow = true;
  roof.receiveShadow = true;
  
  scene.add(base);
  scene.add(roof);
  
  // Add physics for house base
  const baseShape = new Ammo.btBoxShape(new Ammo.btVector3(baseWidth/2, baseHeight/2, baseDepth/2));
  const basePos = new THREE.Vector3(x, y + baseHeight/2, z);
  const baseQuat = new THREE.Quaternion();
  createRigidBody(base, baseShape, 0, basePos, baseQuat);
  
  // Add door and windows (visual only)
  addHouseDetails(x, y, z, baseWidth, baseHeight, baseDepth);
}

// Add door and windows to house
function addHouseDetails(x, y, z, width, height, depth) {
  const doorWidth = 0.4;
  const doorHeight = 0.8;
  const windowSize = 0.4;
  
  // Door - Simple plane with texture
  const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
  const doorMaterial = new THREE.MeshPhongMaterial({ color: 0x8D6E63 });
  
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  // Position door on front of house, slightly above ground
  door.position.set(x, y + doorHeight/2, z + depth/2 + 0.01);
  door.castShadow = false;
  door.receiveShadow = true;
  
  scene.add(door);
  
  // Windows
  const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
  const windowMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xB3E5FC, 
    emissive: 0x0277BD,
    emissiveIntensity: 0.2
  });
  
  // Front window
  const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
  frontWindow.position.set(x + width/4, y + height/2, z + depth/2 + 0.01);
  
  // Side windows (one on each side)
  const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
  leftWindow.position.set(x - width/2 - 0.01, y + height/2, z);
  leftWindow.rotation.y = Math.PI/2;
  
  const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
  rightWindow.position.set(x + width/2 + 0.01, y + height/2, z);
  rightWindow.rotation.y = Math.PI/2;
  
  scene.add(frontWindow);
  scene.add(leftWindow);
  scene.add(rightWindow);
}

// Add UI elements: title and instructions
function addUIElements() {
  // Add CSS styles for UI
  const style = document.createElement('style');
  style.textContent = `
    .game-title {
      position: absolute;
      top: 20px;
      left: 20px;
      font-family: 'Arial', sans-serif;
      font-size: 28px;
      font-weight: bold;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
      opacity: 1;
      transition: opacity 1s;
    }
    .instructions-prompt {
      position: absolute;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      font-family: 'Arial', sans-serif;
      font-size: 18px;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
      animation: blink 2s infinite;
    }
    .instructions-panel {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: #ffffff;
      padding: 20px;
      border-radius: 8px;
      font-family: 'Arial', sans-serif;
      display: none;
      z-index: 10;
      max-width: 500px;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  document.head.appendChild(style);

  // Create title element
  const titleElement = document.createElement('div');
  titleElement.className = 'game-title';
  titleElement.textContent = 'Tropical Bird Sim';
  document.body.appendChild(titleElement);

  // Create instructions prompt
  const instructionsPrompt = document.createElement('div');
  instructionsPrompt.className = 'instructions-prompt';
  instructionsPrompt.textContent = 'Press I for Instructions';
  document.body.appendChild(instructionsPrompt);

  // Create instructions panel
  const instructionsPanel = document.createElement('div');
  instructionsPanel.className = 'instructions-panel';
  instructionsPanel.innerHTML = `
    <h2>Game Instructions</h2>
    <ul>
      <li><strong>F:</strong> Fire projectile</li>
      <li><strong>WASD/Arrow keys:</strong> Move in first-person mode</li>
      <li><strong>Mouse:</strong> Look around</li>
      <li><strong>Space:</strong> Jump</li>
      <li><strong>Shift+F:</strong> Toggle first-person camera mode</li>
      <li><strong>M:</strong> Show camera position in console (for debugging)</li>
    </ul>
    <p>Objective: Hit the flying birds with projectiles!</p>
    <p>Press I to close instructions</p>
  `;
  document.body.appendChild(instructionsPanel);

  // Make title disappear after 10 seconds
  setTimeout(() => {
    titleElement.style.opacity = '0';
  }, 10000);

  // Store references to the instructions elements
  window.instructionsPrompt = instructionsPrompt;
  window.instructionsPanel = instructionsPanel;
}

// Toggle instructions panel
function toggleInstructions() {
  const panel = window.instructionsPanel;
  if (panel) {
    if (panel.style.display === 'block') {
      panel.style.display = 'none';
    } else {
      panel.style.display = 'block';
    }
  }
}