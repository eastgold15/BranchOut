"use client";

import * as THREE from "three";

let cachedTexture: THREE.CanvasTexture | null = null;

/**
 * 生成程序化树皮纹理（Canvas 绘图，无需外部图片）
 */
export function getBarkTexture(): THREE.CanvasTexture {
  if (cachedTexture) {
    return cachedTexture;
  }

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // 1. 底色 — 暖褐色
  ctx.fillStyle = "#4A3728";
  ctx.fillRect(0, 0, size, size);

  // 2. 纵向树皮沟壑
  for (let x = 0; x < size; x += 3 + Math.random() * 4) {
    const brightness = 50 + Math.random() * 60;
    ctx.strokeStyle = `rgb(${brightness - 10}, ${brightness - 20}, ${brightness - 30})`;
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    for (let y = 0; y < size; y++) {
      const wobble =
        Math.sin(y * 0.06) * 1.8 + Math.sin(y * 0.025 + x * 0.1) * 2.5;
      ctx.lineTo(x + wobble, y);
    }
    ctx.stroke();
  }

  // 3. 横向裂纹
  for (let i = 0; i < 15; i++) {
    const y = 10 + Math.random() * (size - 20);
    const startX = Math.random() * size * 0.3;
    const len = 20 + Math.random() * 50;
    ctx.strokeStyle = `rgba(25, 18, 12, ${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    for (let x = startX; x < startX + len; x++) {
      const wobble = Math.sin(x * 0.08 + y) * 1.5;
      ctx.lineTo(x, y + wobble);
    }
    ctx.stroke();
  }

  // 4. 苔藓斑点（微绿调）
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const green = 70 + Math.random() * 50;
    ctx.fillStyle = `rgba(40, ${green}, 30, ${0.05 + Math.random() * 0.1})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  cachedTexture = texture;
  return texture;
}
