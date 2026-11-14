import * as THREE from 'three';

function noise(x:number,z:number) {
  const hash=(a:number,b:number)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v);};
  const ix=Math.floor(x),iz=Math.floor(z);let u=x-ix,v=z-iz;u=u*u*(3-2*u);v=v*v*(3-2*v);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),u),THREE.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),u),v);
}

function terrainHeight(x:number,z:number) {
  const r=Math.hypot(x,z),blend=THREE.MathUtils.smoothstep(r,85,190);
  const ridge=1-Math.abs(noise(x*.004,z*.004)*2-1);
  const mountains=THREE.MathUtils.smoothstep(r,200,440)*(35+ridge*ridge*145+noise(x*.017,z*.017)*22);
  return -1.05+(noise(x*.012,z*.012)*16+noise(x*.035,z*.035)*5)*blend+mountains;
}

/** Deterministic dry terrain: level foundations, gravel and distant low ridges. */
export function buildLaunchTerrain() {
  const geometry=new THREE.PlaneGeometry(1800,1800,180,180);geometry.rotateX(-Math.PI/2);
  const pos=geometry.getAttribute('position'),colors=new Float32Array(pos.count*3);
  const sand=new THREE.Color(0xa89a80),stone=new THREE.Color(0x746f64),dust=new THREE.Color(0xc4b49a);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i),r=Math.hypot(x,z);
    pos.setY(i,terrainHeight(x,z));
    const color=sand.clone().lerp(stone,noise(x*.026,z*.026)*.6).lerp(dust,noise(x*.007,z*.007)*.5);
    if(r>240)color.lerp(new THREE.Color(0x777e87),THREE.MathUtils.smoothstep(r,240,650)*.6);
    color.toArray(colors,i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();
  const pixels=new Uint8Array(128*128*4);
  for(let i=0;i<128*128;i++){
    const value=180+Math.floor(noise(i%128*1.3,Math.floor(i/128)*1.3)*75);
    pixels.set([value,value,value,255],i*4);
  }
  const grain=new THREE.DataTexture(pixels,128,128);grain.needsUpdate=true;
  grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(130,130);
  grain.magFilter=THREE.LinearFilter;grain.minFilter=THREE.LinearMipmapLinearFilter;grain.generateMipmaps=true;
  const material=new THREE.MeshStandardMaterial({vertexColors:true,map:grain,bumpMap:grain,bumpScale:.09,roughness:1});
  const ground=new THREE.Mesh(geometry,material);ground.receiveShadow=true;
  ground.name='Dry gravel terrain';
  const wind={value:0};ground.userData.wind=wind;
  const foliageMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
  foliageMaterial.onBeforeCompile=shader=>{
    shader.uniforms.uWind=wind;
    shader.vertexShader='uniform float uWind;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n transformed.x += sin(uWind*1.4 + instanceMatrix[3].x*.17 + position.y)*.06*max(0.0,position.y+.3);');
  };
  const foliage=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.55,1),foliageMaterial,900);
  const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.025,.045,1,5),new THREE.MeshStandardMaterial({color:0x66523c,roughness:1}),300);
  const object=new THREE.Object3D(),leafColor=new THREE.Color();
  for(let i=0;i<300;i++){
    const angle=i*2.399963, radius=82+noise(i*.73,7)*135;
    const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
    // Sample the actual grid surface so bushes stay rooted on sloping ground.
    const gx=Math.floor((x+900)/10)*10-900,gz=Math.floor((z+900)/10)*10-900;
    const u=(x-gx)/10,v=(z-gz)/10;
    const y=THREE.MathUtils.lerp(THREE.MathUtils.lerp(terrainHeight(gx,gz),terrainHeight(gx+10,gz),u),THREE.MathUtils.lerp(terrainHeight(gx,gz+10),terrainHeight(gx+10,gz+10),u),v);
    const size=.5+noise(i*2.1,4)*1.1;
    object.position.set(x,y+size*.35,z);object.rotation.set(0,angle,0);object.scale.set(size,size,size);object.updateMatrix();stems.setMatrixAt(i,object.matrix);
    for(let j=0;j<3;j++){
      object.position.set(x+Math.cos(j*2.1)*size*.25,y+size*(.55+j*.12),z+Math.sin(j*2.1)*size*.25);
      object.scale.set(size*(.8+j*.12),size*.75,size*.8);object.rotation.set(i*.2,angle+j,0);object.updateMatrix();foliage.setMatrixAt(i*3+j,object.matrix);
      leafColor.setHex([0x626747,0x73734e,0x4e5c3e,0x817953][(i+j)%4]);foliage.setColorAt(i*3+j,leafColor);
    }
  }
  foliage.castShadow=foliage.receiveShadow=true;stems.castShadow=true;
  ground.add(foliage,stems);return ground;
}
