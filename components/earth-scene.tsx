'use client';
import { useEffect, useRef } from 'react';
import { Satellite } from 'lucide-react';

/** Orthographic projection of the bundled Earth texture; illustrative, not an orbit propagator. */
export function EarthScene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    const texture = new Image();
    texture.onload = () => {
      if (cancelled || !canvas.current) return;
      const source = document.createElement('canvas');
      source.width = texture.width; source.height = texture.height;
      const src = source.getContext('2d');
      const dst = canvas.current.getContext('2d');
      if (!src || !dst) return;
      src.drawImage(texture, 0, 0);
      const pixels = src.getImageData(0, 0, source.width, source.height).data;
      const size = 640, frame = dst.createImageData(size, size);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const nx = (x - size / 2) / (size / 2 - 3), ny = (y - size / 2) / (size / 2 - 3);
        const r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const nz = Math.sqrt(1 - r2);
        const u = ((Math.atan2(nx, nz) / (2 * Math.PI) + 0.53) % 1 + 1) % 1;
        const v = Math.acos(-ny) / Math.PI;
        const si = (Math.min(source.height - 1, Math.floor(v * source.height)) * source.width + Math.floor(u * source.width)) * 4;
        const i = (y * size + x) * 4;
        const light = 0.08 + 0.94 * Math.max(0, -nx * 0.62 - ny * 0.28 + nz * 0.72);
        const rim = Math.pow(1 - nz, 5) * 0.65;
        frame.data[i] = pixels[si] * light + rim * 50;
        frame.data[i + 1] = pixels[si + 1] * light + rim * 130;
        frame.data[i + 2] = pixels[si + 2] * light + rim * 220;
        frame.data[i + 3] = Math.min(255, (1 - Math.sqrt(r2)) * 640 * 255);
      }
      dst.putImageData(frame, 0, 0);
    };
    texture.src = '/earth.jpg';
    return () => { cancelled = true; };
  }, []);
  return <div className="exp-earth" aria-hidden="true"><canvas ref={canvas} width={640} height={640}/><svg className="exp-orbit" viewBox="0 0 700 700"><ellipse cx="350" cy="350" rx="335" ry="150" transform="rotate(-28 350 350)"/><circle cx="82" cy="504" r="5"/></svg><Satellite className="exp-satellite" size={44} strokeWidth={1.2}/></div>;
}
