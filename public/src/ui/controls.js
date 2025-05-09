import * as dat from 'https://unpkg.com/dat.gui@0.7.9/build/dat.gui.module.js';

let gui = null;
let params = {
  spitballSize: 0.5,
  launcherPower: 10,
  cupStack: 'Pyramid',
  splash: true,
  reset: () => {},
};

export function initControls({ onSize, onPower, onStack, onReset, onSplash }) {
  gui = new dat.GUI({ width: 300 });
  gui.domElement.style.position = 'absolute';
  gui.domElement.style.top = '10px';
  gui.domElement.style.right = '10px';
  gui.domElement.style.zIndex = '10';
  gui.add(params, 'spitballSize', 0.2, 1.0, 0.01).name('Spitball Size').onChange(onSize);
  gui.add(params, 'launcherPower', 5, 30, 0.1).name('Launcher Power').onChange(onPower);
  gui.add(params, 'cupStack', ['Pyramid', 'Wall', 'Random']).name('Cup Stack').onChange(onStack);
  gui.add(params, 'splash').name('Splash Effect').onChange(onSplash);
  gui.add(params, 'reset').name('Reset').onChange(onReset);
  // Collapsible/expandable by default in dat.GUI
  console.log('UI controls set up');
}

export function getParams() {
  return params;
} 