// src/utils/helpers.js
export const helpers = {};

export function randomColor() {
  // Return a random pastel color
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 80%)`;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
} 