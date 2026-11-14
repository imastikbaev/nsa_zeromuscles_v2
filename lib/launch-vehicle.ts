import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Fictional orbital vehicle. Units match the cinematic; not engineering hardware specifications. */
export function buildLaunchVehicle() {
  const rocket=new THREE.Group();rocket.name='Launch vehicle';rocket.scale.set(.86,1,.86);
  const booster=new THREE.Group();booster.name='First stage';rocket.add(booster);
  const upper=new THREE.Group();upper.name='Upper stage';rocket.add(upper);
  const fairing=new THREE.Group();fairing.name='Payload fairing';upper.add(fairing);
  const paint=new THREE.MeshPhysicalMaterial({color:0xe2e5df,metalness:.18,roughness:.38,clearcoat:.28,clearcoatRoughness:.35});
  const bodyPaint=paint.clone();bodyPaint.name='Painted fuselage';
  const composite=new THREE.MeshStandardMaterial({color:0x202a30,metalness:.35,roughness:.46});
  const aluminium=new THREE.MeshStandardMaterial({color:0x9da9af,metalness:.82,roughness:.28});
  const nickel=new THREE.MeshStandardMaterial({color:0x514b45,metalness:.8,roughness:.38,side:THREE.DoubleSide});
  const copper=new THREE.MeshStandardMaterial({color:0x9d6948,metalness:.8,roughness:.4});
  const seam=new THREE.MeshStandardMaterial({color:0x667178,metalness:.5,roughness:.5});
  function mesh(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0){
    const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function lathe(profile:number[][],m:THREE.Material,parent:THREE.Object3D,segments=96){
    const geometry=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),segments);
    const minY=Math.min(...profile.map(p=>p[1])),maxY=Math.max(...profile.map(p=>p[1]));
    const uv=geometry.getAttribute('uv'),position=geometry.getAttribute('position');
    for(let i=0;i<uv.count;i++)uv.setY(i,(position.getY(i)-minY)/(maxY-minY));
    return mesh(geometry,m,parent);
  }
  function ring(r:number,y:number,thickness:number,m:THREE.Material,parent:THREE.Object3D){
    const o=mesh(new THREE.TorusGeometry(r,thickness,6,96),m,parent,0,y);o.rotation.x=Math.PI/2;return o;
  }
  function pipe(a:THREE.Vector3,b:THREE.Vector3,r:number,parent:THREE.Object3D){
    const delta=b.clone().sub(a),o=mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),aluminium,parent);
    o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;
  }
  // Flush panel joints and a subtly radiused thrust skirt, rather than stacked primitive cylinders.
  lathe([[.55,.62],[.61,.66],[.65,.78],[.66,1],[.66,6.05],[.655,6.18],[.64,6.23]],bodyPaint,booster);
  lathe([[.58,.64],[.58,.88],[.65,1.03],[.663,1.06]],composite,booster);
  for(const y of [1.1,2.52,4.05,5.6,6.18])ring(.661,y,.008,seam,booster);
  ring(.656,6.2,.023,aluminium,booster);
  // Surface servicing ports and flush longitudinal cable raceway.
  for(const angle of [.3,2.4,4.5]) {
    const rail=mesh(new THREE.BoxGeometry(.065,4.9,.035),paint,booster,Math.sin(angle)*.667,3.55,Math.cos(angle)*.667);
    rail.rotation.y=angle;
    for(const y of [1.5,3,4.5,5.7]){
      const hatch=mesh(new THREE.CylinderGeometry(.064,.064,.016,24),aluminium,booster,Math.sin(angle+.6)*.662,y,Math.cos(angle+.6)*.662);
      hatch.rotation.x=Math.PI/2;hatch.rotation.z=-(angle+.6);
    }
  }
  // Instanced bolts preserve fine detail without hundreds of individual draw calls.
  const bolts=new THREE.InstancedMesh(new THREE.SphereGeometry(.012,6,4),aluminium,96);
  const matrix=new THREE.Matrix4();let bi=0;
  for(const y of [1.1,6.2])for(let i=0;i<48;i++){
    const a=i*Math.PI/24;matrix.makeTranslation(Math.sin(a)*.667,y,Math.cos(a)*.667);bolts.setMatrixAt(bi++,matrix);
  }
  bolts.castShadow=true;booster.add(bolts);
  function engine(parent:THREE.Object3D,x:number,z:number,size=1,y=0){
    const assembly=new THREE.Group();assembly.position.set(x,y,z);assembly.scale.setScalar(size);parent.add(assembly);
    // Two-sided wall: the bell has a visible hollow exit, lip and narrow throat.
    lathe([[.225,.03],[.225,.065],[.205,.12],[.158,.23],[.105,.38],[.073,.5],[.071,.58],[.078,.65],[.09,.72],
      [.083,.72],[.071,.65],[.063,.58],[.065,.5],[.097,.38],[.15,.23],[.197,.12],[.217,.065],[.217,.03]],nickel,assembly,48);
    ring(.222,.05,.01,aluminium,assembly);
    for(let j=0;j<7;j++)ring(.078+j*.003,.53+j*.024,.006,copper,assembly);
    mesh(new THREE.SphereGeometry(.11,16,12),composite,assembly,0,.83,0);
    for(const side of [-1,1])pipe(new THREE.Vector3(side*.12,.3,0),new THREE.Vector3(side*.08,.85,0),.014,assembly);
  }
  engine(booster,0,0,.86,.05);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;engine(booster,Math.sin(a)*.43,Math.cos(a)*.43,.9,.05);}
  // Upper-stage engine becomes visible when the first stage separates.
  engine(upper,0,0,1.85,6.12);
  lathe([[.64,6.24],[.66,6.3],[.66,7.1],[.61,7.25]],composite,booster);
  for(let i=0;i<32;i++){
    const a=i*Math.PI/16;const rib=mesh(new THREE.BoxGeometry(.012,.83,.016),aluminium,booster,Math.sin(a)*.663,6.72,Math.cos(a)*.663);rib.rotation.y=a;
  }
  lathe([[.51,7.08],[.59,7.23],[.61,7.4],[.61,8.65],[.64,8.85],[.82,9.18],[.85,9.3]],paint,upper);
  for(const y of [7.4,8.65,8.85])ring(y>8.8?.64:.612,y,.009,seam,upper);
  // Tangent ogive transitions continuously to a rounded nose; no cone apex.
  const profile:number[][]=[[.85,9.25],[.85,9.65]];
  for(let i=1;i<=32;i++){
    const t=i/32;profile.push([.85*Math.cos(t*Math.PI/2),9.65+1.9*Math.sin(t*Math.PI/2)]);
  }
  const fairingHalves:THREE.Group[]=[];
  const shellPaint=paint.clone();shellPaint.side=THREE.DoubleSide;
  for(let side=0;side<2;side++) {
    const half=new THREE.Group();half.name=`Fairing half ${side+1}`;fairing.add(half);fairingHalves.push(half);
    mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),64,side*Math.PI,Math.PI),shellPaint,half);
    const rim=mesh(new THREE.TorusGeometry(.851,.012,6,64,Math.PI),aluminium,half,0,9.27);
    rim.rotation.x=Math.PI/2;rim.rotation.z=side*Math.PI-Math.PI/2;
    const angle=side*Math.PI;
    const points=profile.filter(([r])=>r>.012).map(([r,y])=>new THREE.Vector3(Math.sin(angle)*(r+.002),y,Math.cos(angle)*(r+.002)));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),40,.0045,4,false),seam,half);
    for(let i=0;i<8;i++){
      const a=side*Math.PI+(i+.5)*Math.PI/8;
      const latch=mesh(new THREE.BoxGeometry(.045,.085,.015),aluminium,half,Math.sin(a)*.854,9.34,Math.cos(a)*.854);latch.rotation.y=a;
    }
  }
  // Small high-contrast roll markings; physical surfaces, so visible without texture downloads.
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const mark=mesh(new THREE.CylinderGeometry(.662,.662,.19,12,1,true,a,.18),composite,booster,0,5.8,0);
    mark.name='Roll reference';
  }
  // The first stage moves as a unit. Batch its static fittings by material while
  // retaining instanced fasteners and independent upper-stage/fairing groups.
  booster.updateWorldMatrix(true,true);
  const inverse=booster.matrixWorld.clone().invert();
  const batches=new Map<THREE.Material,THREE.Mesh[]>();
  booster.traverse(object=>{
    if(object instanceof THREE.Mesh && !(object instanceof THREE.InstancedMesh) && !Array.isArray(object.material)) {
      const batch=batches.get(object.material)??[];batch.push(object);batches.set(object.material,batch);
    }
  });
  batches.forEach((objects,material)=>{
    const geometries=objects.map(object=>object.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld)));
    const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
    if(!merged)return;
    objects.forEach(object=>{object.removeFromParent();object.geometry.dispose();});
    const batch=new THREE.Mesh(merged,material);batch.castShadow=batch.receiveShadow=true;booster.add(batch);
  });
  return {rocket,booster,upper,fairing,fairingHalves,paint,bodyPaint};
}
