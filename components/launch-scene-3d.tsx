"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildLaunchVehicle } from "@/lib/launch-vehicle";
import { buildLaunchTerrain } from "@/lib/launch-terrain";
import { buildSpaceport } from "@/lib/launch-spaceport";
import type { Design } from "@/lib/data";

const ease = (v: number) => { const x = Math.max(0, Math.min(1, v)); return x * x * (3 - 2 * x); };

/** A cinematic only: this component never reads or writes mission checkpoints. */
export default function LaunchScene3D({ time, design, onReady, viewMode = "cinematic" }: {
  time: number; design: Design; viewMode?: "cinematic" | "vehicle" | "engines" | "spaceport"; onReady: (ready: boolean) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const draw = useRef<((time: number) => void) | null>(null);
  const latestTime = useRef(time);
  const view = useRef(viewMode);
  useEffect(() => { latestTime.current = time; view.current=viewMode; draw.current?.(time); }, [time,viewMode]);

  const { launcher, panels, systems: { antenna }, instruments } = design;
  const hires = instruments.includes("hires");
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    onReady(false);
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    } catch {
      return; // The SVG remains visible if WebGL is unavailable.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    let disposed = false;
    let failed = false;
    const scene = new THREE.Scene();
    // Soft image-based reflections make metal read as metal without remote HDR files.
    const reflectionRoom=new RoomEnvironment();
    const pmrem=new THREE.PMREMGenerator(renderer);
    let reflection:THREE.WebGLRenderTarget | undefined;
    try {reflection=pmrem.fromScene(reflectionRoom,.06);scene.environment=reflection.texture;scene.environmentIntensity=.35;}
    catch { /* Direct lighting remains available on limited graphics devices. */ }
    finally {reflectionRoom.dispose();pmrem.dispose();}
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 1500);
    const sky = new THREE.Color("#a3c4d8");
    const haze = new THREE.Fog(0xa3c4d8, 150, 1050);
    const night = new THREE.Color("#030814");
    scene.background = sky.clone();
    const ambient = new THREE.HemisphereLight(0xc4e4ff, 0x35414a, 1.7);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffecd1, 3.2);
    sun.position.set(35, 55, 25);
    sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);
    Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:180});
    sun.shadow.bias=-.0005;sun.shadow.normalBias=.03;
    scene.add(sun);
    const white = new THREE.MeshStandardMaterial({ color: 0xe4eaf0, metalness: .35, roughness: .36 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x263743, metalness: .6, roughness: .4 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a655, metalness: .65, roughness: .32 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x154c83, metalness: .45, roughness: .27, side: THREE.DoubleSide });
    function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x=0, y=0, z=0) {
      const object = new THREE.Mesh(geometry, material);
      object.position.set(x,y,z); object.castShadow=true; object.receiveShadow=true; parent.add(object); return object;
    }
    const ground = new THREE.Group(); scene.add(ground);
    const landscape=buildLaunchTerrain();ground.add(landscape);
    mesh(new THREE.CylinderGeometry(7,8,1,48), dark, ground,0,-.5,0);
    ground.add(buildSpaceport());
    const tower = new THREE.Group(); ground.add(tower); tower.position.x = -5;
    for (const x of [-1,1]) for (const z of [-1,1]) mesh(new THREE.BoxGeometry(.22,15,.22),dark,tower,x,7,z);
    for (let i=0;i<8;i++) mesh(new THREE.BoxGeometry(2.2,.2,2.2),dark,tower,0,i*2,0);
    const serviceArm=new THREE.Group();tower.add(serviceArm);serviceArm.position.set(1,10,0);
    mesh(new THREE.BoxGeometry(3,.3,.6),white,serviceArm,1.5,0,0);
    for(let i=0;i<7;i++)for(const side of [-1,1]){
      const brace=mesh(new THREE.BoxGeometry(.12,2.8,.12),white,tower,0,1+i*2,side);
      brace.rotation.z=(i%2?1:-1)*Math.PI/4;
    }
    mesh(new THREE.BoxGeometry(.6,13,.7),dark,tower,0,6.2,0);
    for(let y=1;y<14;y+=.6)mesh(new THREE.BoxGeometry(.6,.045,.08),white,tower,1.2,y,1.1);
    const {rocket,booster,fairing,fairingHalves,bodyPaint}=buildLaunchVehicle();scene.add(rocket);
    const scale = ({swift:.85,atlas:1,titan:1.12,horizon:1.22} as Record<string,number>)[launcher] ?? 1;
    rocket.scale.multiplyScalar(scale);
    const bodyMaps: THREE.Texture[]=[];
    const surfaceLoader=new THREE.TextureLoader();
    const refreshSurface=()=>{if(!disposed){bodyPaint.needsUpdate=true;draw.current?.(latestTime.current);}};
    const bodyMap=surfaceLoader.load('/models/launch-vehicle/body-color.webp',refreshSurface);
    bodyMap.colorSpace=THREE.SRGBColorSpace;bodyMap.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    bodyPaint.color.set(0xffffff);bodyPaint.map=bodyMap;
    bodyPaint.roughnessMap=surfaceLoader.load('/models/launch-vehicle/body-roughness.png',refreshSurface);
    bodyPaint.roughness=.65;
    bodyPaint.bumpMap=surfaceLoader.load('/models/launch-vehicle/body-bump.png',refreshSurface);bodyPaint.bumpScale=.003;
    bodyMaps.push(bodyMap,bodyPaint.roughnessMap,bodyPaint.bumpMap);
    const flameMaterial = new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
      vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying vec2 vUv;uniform float uTime;
        void main(){float d=1.0-vUv.y;
          float turbulence=sin(vUv.x*75.0+d*38.0-uTime*35.0)*sin(vUv.x*31.0-d*51.0+uTime*23.0);
          float diamonds=pow(max(0.0,sin(d*42.0-uTime*2.0)),9.0);
          float alpha=(1.0-smoothstep(.25,1.0,d))*(.38+.12*turbulence+.25*diamonds);
          vec3 hot=mix(vec3(.45,.65,1.0),vec3(1.0,.48,.13),smoothstep(.05,.35,d));
          hot=mix(hot,vec3(1.0,.92,.7),diamonds*.6);
          gl_FragColor=vec4(hot,alpha);
        }`
    });
    const flame=mesh(new THREE.CylinderGeometry(.34,.85,6,48,16,true),flameMaterial,rocket,0,-2.9,0);
    const flameCore=mesh(new THREE.CylinderGeometry(.22,.42,3,32,8,true),flameMaterial,rocket,0,-1.4,0);
    flame.castShadow=flameCore.castShadow=false;
    // Soft sprites avoid the hard-edged "balls" of mesh-based exhaust smoke.
    const smokeCanvas=document.createElement('canvas');smokeCanvas.width=smokeCanvas.height=128;
    const ctx=smokeCanvas.getContext('2d')!;
    const gradient=ctx.createRadialGradient(64,64,8,64,64,64);
    gradient.addColorStop(0,'rgba(255,255,255,.65)');gradient.addColorStop(.45,'rgba(255,255,255,.3)');gradient.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    const smokeTexture=new THREE.CanvasTexture(smokeCanvas);
    const smoke=Array.from({length:40},()=>{
      const p=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTexture,color:0xc8c4b7,transparent:true,depthWrite:false}));
      ground.add(p);return p;
    });
    const exhaustLight=new THREE.PointLight(0xffa64d,0,22,2);exhaustLight.position.set(0,1,0);scene.add(exhaustLight);

    const space = new THREE.Group(); scene.add(space);
    const earthMaterial=new THREE.MeshStandardMaterial({color:0x89b4d1,roughness:1});
    const earth=mesh(new THREE.SphereGeometry(19,64,40),earthMaterial,space,-5,-21,-20);
    const texture = new THREE.TextureLoader().load('/earth.jpg', () => {
      if (disposed) return;
      earthMaterial.map=texture; earthMaterial.color.set(0xffffff); earthMaterial.needsUpdate=true;
      draw.current?.(latestTime.current);
    }, undefined, () => { /* A blue globe remains when the local texture cannot load. */ });
    texture.colorSpace=THREE.SRGBColorSpace;
    const atmosphere=mesh(new THREE.SphereGeometry(19.18,48,32),new THREE.MeshBasicMaterial({color:0x62abff,transparent:true,opacity:.11,side:THREE.BackSide,depthWrite:false}),space,-5,-21,-20);
    atmosphere.renderOrder=1;
    const starPositions = new Float32Array(450*3);
    let seed=42;
    for(let i=0;i<starPositions.length;i++){seed=(seed*16807)%2147483647;starPositions[i]=(seed/2147483647-.5)*700;}
    const starsGeometry=new THREE.BufferGeometry();starsGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));
    const starsMaterial=new THREE.PointsMaterial({color:0xd8e8ff,size:.6,sizeAttenuation:true});
    const stars=new THREE.Points(starsGeometry,starsMaterial);space.add(stars);
    const craft = new THREE.Group(); rocket.add(craft);craft.scale.setScalar(.32);
    mesh(new THREE.BoxGeometry(1.5,1.8,1.4),gold,craft);
    mesh(new THREE.BoxGeometry(1.6,.2,1.5),white,craft,0,.9,0);
    const lens=mesh(new THREE.CylinderGeometry(hires?.4:.25,hires?.4:.25,.3,24),dark,craft,0,0,.8);lens.rotation.x=Math.PI/2;
    const wings: THREE.Group[]=[];
    const width = Math.max(1.6,Math.min(4.4,1.4+panels*.12));
    for(const side of [-1,1]) {
      const wing=new THREE.Group();wing.position.x=side*.8;craft.add(wing);wings.push(wing);
      mesh(new THREE.BoxGeometry(width,.06,1.6),blue,wing,side*width/2,0,0);
      for(let i=0;i<6;i++)mesh(new THREE.BoxGeometry(.025,.07,1.6),white,wing,side*width*i/5,0,0);
      mesh(new THREE.BoxGeometry(width,.07,.025),white,wing,side*width/2,0,0);
    }
    mesh(new THREE.CylinderGeometry(.035,.035,.8,8),white,craft,0,1.35,0);
    const dish = antenna==='dish'
      ? mesh(new THREE.SphereGeometry(.6,20,12,0,Math.PI*2,0,.8),white,craft,0,1.6,0)
      : mesh(new THREE.BoxGeometry(antenna==='array'?1.1:.5,.12,.5),white,craft,0,1.75,0);
    dish.rotation.z=.35;
    const upperFlame=mesh(new THREE.CylinderGeometry(.12,.38,1.6,32,8,true),flameMaterial,rocket,0,5.35,0);
    upperFlame.castShadow=false;
    const craftWorld=new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    let firstFrame=true;
    draw.current=(time:number)=>{
      if(disposed || failed)return;
      flameMaterial.uniforms.uTime.value=time;
      landscape.userData.wind.value=time;
      const orbit = time>=12;
      ground.visible=!orbit;rocket.visible=true;space.visible=orbit;space.position.set(7,70,0);
      booster.visible=time<15;upperFlame.visible=time>=10&&time<18;
      const fairingRelease=ease((time-14)/3);
      fairingHalves.forEach((half,i)=>{half.position.set((i===0?1:-1)*fairingRelease*3,-fairingRelease,0);half.rotation.z=(i===0?-1:1)*fairingRelease*.12;});
      fairing.visible=true;craft.visible=orbit;
      scene.fog=orbit?null:haze;
      haze.color.copy(sky).lerp(night,ease((time-5)/7));
      sun.castShadow=!orbit;
      serviceArm.rotation.y=-ease((time-.5)/2)*1.3;
      const climb = ease((time-3)/9);
      (scene.background as THREE.Color).copy(sky).lerp(night,orbit?1:ease((time-5)/7));
      if(!orbit) {
        rocket.position.set(climb*7,climb*70,0);
        rocket.rotation.set(0,0,-climb*.22);
        const separation=ease((time-9.5)/2.5);
        booster.position.set(-separation*2,-separation*10,0);booster.rotation.z=-separation*.22;
        flame.visible=flameCore.visible=time>=3&&time<9.5;
        flame.scale.y=1+.08*Math.sin(time*42);flameCore.scale.y=flame.scale.y;
        exhaustLight.position.copy(rocket.position);exhaustLight.position.y+=1;
        exhaustLight.intensity=flame.visible?130:0;
        fairing.visible=true;
        smoke.forEach((p,i)=>{
          const age=((Math.max(0,time-2.5)*.25+i/40)%1);
          const angle=i*2.399;
          const fadeIn=ease((time-2.5)*2), fadeOut=1-ease((time-7)/4);
          p.visible=time>=2.5&&time<11;
          p.material.opacity=(1-age)*fadeIn*fadeOut*.7;
          p.position.set(Math.cos(angle)*age*20,age*4+.1,Math.sin(angle)*age*14+3);
          p.scale.setScalar(2+age*11);
        });
        // An establishing fly-in shows the campus before tracking the ascending rocket.
        const approach=ease(time/3);
        camera.position.set(65+(18-65)*approach-climb*5,32+(8-32)*approach+climb*70,80+(26-80)*approach-climb*7);
        lookAt.set(rocket.position.x,rocket.position.y+5*scale,0);
      } else {
        exhaustLight.intensity=0;
        const reveal=ease((time-18)/3);
        rocket.position.set(7,70,0);rocket.rotation.set(0,0,-.22-.65*ease((time-12)/8));
        booster.position.set(-2-(time-12)*.7,-10-(time-12)*4,0);booster.rotation.z=-.22-(time-12)*.1;
        flame.visible=flameCore.visible=false;
        craft.position.set(0,9.95+reveal*3,0);
        craft.rotation.set(0,0,0);
        wings.forEach((w,i)=>{w.rotation.z=(i===0?-1:1)*(1-ease((time-20)/3.5))*Math.PI/2;});
        earth.rotation.y=.6+(time-12)*.008;
        rocket.updateMatrixWorld(true);craft.getWorldPosition(craftWorld);
        const track=ease((time-12)/4);
        lookAt.set(7,70+5*scale,0).lerp(craftWorld,track);
        const distance=1-reveal*.65;
        camera.position.set(13,78,19).lerp(craftWorld.clone().add(new THREE.Vector3(8,4,13).multiplyScalar(distance)),track);
      }
      if(view.current!=="cinematic") {
        ground.visible=space.visible=false;rocket.visible=booster.visible=true;craft.visible=false;upperFlame.visible=false;scene.fog=null;
        fairingHalves.forEach(half=>{half.position.set(0,0,0);half.rotation.set(0,0,0);});
        (scene.background as THREE.Color).set(0x101a24);
        rocket.position.set(0,0,0);rocket.rotation.set(0,.2,0);
        booster.position.set(0,0,0);booster.rotation.set(0,0,0);
        flame.visible=flameCore.visible=false;exhaustLight.intensity=0;
        if(view.current==="spaceport") {
          ground.visible=true;scene.fog=haze;haze.color.copy(sky);sun.castShadow=true;
          (scene.background as THREE.Color).copy(sky);
          camera.position.set(85,55,100);lookAt.set(4,1,0);
        } else if(view.current==="engines") {
          camera.position.set(2.3*scale,-1.4*scale,3.8*scale);lookAt.set(0,.8*scale,0);
        } else {
          camera.position.set(12*scale,7*scale,19*scale);lookAt.set(0,5.7*scale,0);
        }
      }
      if(camera.aspect<1.1)camera.position.sub(lookAt).multiplyScalar(1.1/camera.aspect).add(lookAt);
      camera.lookAt(lookAt);
      try { renderer.render(scene,camera); if(firstFrame){firstFrame=false;onReady(true);} }
      catch { failed=true;onReady(false); }
    };
    const resize=()=>{
      const {width,height}=container.getBoundingClientRect();
      if(!width||!height)return;
      renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
      draw.current?.(latestTime.current);
    };
    const observer=new ResizeObserver(resize);observer.observe(container);resize();
    const lost=(event:Event)=>{event.preventDefault();failed=true;onReady(false);};
    renderer.domElement.addEventListener('webglcontextlost',lost);
    return ()=>{
      disposed=true;draw.current=null;observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost',lost);
      const geometries=new Set<THREE.BufferGeometry>();
      const materials=new Set<THREE.Material>();
      scene.traverse(object=>{
        if(object instanceof THREE.InstancedMesh)object.dispose();
        if(object instanceof THREE.Mesh || object instanceof THREE.Points)geometries.add(object.geometry);
        if(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Sprite){
          (Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));
        }
      });
      geometries.forEach(g=>g.dispose());
      const surfaceTextures=new Set<THREE.Texture>();
      materials.forEach(m=>{Object.values(m).forEach(value=>{if(value instanceof THREE.Texture)surfaceTextures.add(value);});m.dispose();});
      surfaceTextures.forEach(t=>t.dispose());
      smokeTexture.dispose();sun.shadow.dispose();bodyMaps.forEach(t=>t.dispose());reflection?.dispose();
      texture.dispose();starsGeometry.dispose();starsMaterial.dispose();
      renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    };
  }, [launcher, panels, antenna, hires, onReady]);
  return <div ref={host} className="ls-3d" aria-hidden="true"/>;
}
