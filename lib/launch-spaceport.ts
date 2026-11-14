import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Fictional compact launch centre, built locally without remote models. */
export function buildSpaceport() {
  const group = new THREE.Group();
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9b9c94, roughness: .93 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x677b83, metalness: .5, roughness: .6 });
  const wall = new THREE.MeshStandardMaterial({ color: 0xc7d0ca, roughness: .82 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x849496, metalness: .4, roughness: .65 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x234957, metalness: .5, roughness: .2 });
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x343c3e, roughness: 1 });
  const interior = new THREE.MeshStandardMaterial({ color: 0x333b3d, roughness: 1 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x242b2c, roughness: .9 });
  const paint = new THREE.MeshStandardMaterial({ color: 0xd9c58c, roughness: .9 });
  function box(w:number,h:number,d:number, material:THREE.Material, x:number,y:number,z:number, parent:THREE.Object3D=group) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function tube(a:THREE.Vector3,b:THREE.Vector3,r:number,parent:THREE.Object3D=group) {
    const delta=b.clone().sub(a);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),steel);
    mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  // Transport apron and service roads sit above the terrain, below pad level.
  box(100,.12,8,asphalt,0,-.88,32);
  box(8,.12,78,asphalt,24,-.87,-3);
  box(34,.15,31,concrete,0,-.85,0);
  for(let i=-46;i<48;i+=8) box(3,.025,.18,paint,i,-.8,32);
  for(let i=-35;i<25;i+=8) box(.18,.025,3,paint,24,-.79,i);
  // Compacted shoulders and a marked parking area tie buildings to the road.
  box(104,.07,11,concrete,0,-.96,32);
  box(11,.07,80,concrete,24,-.95,-3);
  box(21,.13,13,asphalt,41,-.88,44);
  for(let x=32;x<=50;x+=3)box(.12,.02,5,paint,x,-.805,44);
  box(19,.02,.12,paint,41,-.8,46.5);
  // Hangar doors face the approach camera, with corrugated barrel roofs.
  for(const [x,z,w,d] of [[-29,-15,16,22],[-30,14,14,18],[41,-19,18,25]]) {
    const hangar=new THREE.Group();hangar.position.set(x,0,z);group.add(hangar);
    // Hollow shell and recessed doors give the facade real depth.
    box(.25,5,d,wall,-w/2,1.6,0,hangar);box(.25,5,d,wall,w/2,1.6,0,hangar);
    box(w,5,.25,wall,0,1.6,-d/2,hangar);
    box(w,.18,d,concrete,0,-.78,0,hangar);
    box(w-.6,4.7,.15,interior,0,1.55,-d/2+.2,hangar);
    const arch=new THREE.Mesh(new THREE.CylinderGeometry(w/2,w/2,d,28,1,true,Math.PI/2,Math.PI),roof);
    arch.rotation.x=Math.PI/2;arch.scale.z=.32;arch.position.y=4.1;arch.castShadow=true;hangar.add(arch);
    const capShape=new THREE.Shape();capShape.moveTo(w/2,0);capShape.absarc(0,0,w/2,0,Math.PI,false);capShape.closePath();
    for(const side of [-1,1]) {
      const cap=new THREE.Mesh(new THREE.ShapeGeometry(capShape),wall);
      cap.scale.y=.32;cap.position.set(0,4.1,side*d/2);if(side<0)cap.rotation.y=Math.PI;
      cap.castShadow=true;hangar.add(cap);
    }
    // Sliding panels leave a narrow open entrance; tracks, mullions and door seals stay visible.
    const opening=w*.14;
    for(const side of [-1,1])for(let j=0;j<3;j++){
      const panelWidth=(w-opening)/6;
      const px=side*(opening/2+panelWidth*(j+.5));
      box(panelWidth-.05,4.55,.14,steel,px,1.48,d/2+.12,hangar);
      for(let y=0;y<10;y++)box(panelWidth-.08,.026,.045,roof,px,-.5+y*.44,d/2+.21,hangar);
      box(.055,4.55,.07,rubber,px-panelWidth/2,1.48,d/2+.23,hangar);
    }
    box(w+.6,.3,.5,steel,0,3.95,d/2+.3,hangar);
    box(w,.07,.2,steel,0,-.64,d/2+.2,hangar);
    // Clerestory glazing and wall ribs, gutters and downpipes.
    for(let j=0;j<5;j++)box(w*.12,.55,.07,glass,(j-2)*w*.16,4.5,d/2+.04,hangar);
    for(const side of [-1,1]){
      box(.25,.2,d+.4,steel,side*(w/2+.1),4.05,0,hangar);
      for(let j=0;j<12;j++)box(.12,4.8,.12,roof,side*(w/2+.15),1.55,(j/11-.5)*d,hangar);
      tube(new THREE.Vector3(side*(w/2+.22),-.6,d/2-.5),new THREE.Vector3(side*(w/2+.22),4.05,d/2-.5),.075,hangar);
      box(.18,.25,.5,steel,side*(w/2-.5),3.6,d/2+.55,hangar);
      for(let j=0;j<3;j++)box(.18,1,.18,paint,side*(opening/2+.5),-.18,d/2+1+j*.65,hangar);
    }
    box(2.2,1.1,1.4,steel,0,4.1+w*.16+.45,-d*.23,hangar);
    for(let j=0;j<5;j++)box(1.9,.065,.04,rubber,0,4.1+w*.16+.05+j*.18,-d*.23+.72,hangar);
    // An interior rack remains visible through the opening.
    box(2.4,1.7,1.1,roof,0,.15,-d*.15,hangar);
    for(let j=0;j<7;j++) {
      const points=Array.from({length:21},(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/20)*(w/2+.04),4.1+Math.sin(i*Math.PI/20)*(w/2+.04)*.32,(j/6-.5)*d));
      const rib=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,.055,5,false),steel);
      hangar.add(rib);
    }
    box(w+2,.12,9,concrete,0,-.78,d/2+4.5,hangar);
    for(let x=-w/2;x<=w/2;x+=3)box(.025,.008,9,rubber,x,-.715,d/2+4.5,hangar);
    for(let j=1;j<3;j++)box(w+2,.008,.025,rubber,0,-.715,d/2+j*3,hangar);
    // Entry tyre marks and a separate pedestrian access door.
    for(const x of [-.55,.55])box(.13,.01,7,rubber,x,-.705,d/2+3.5,hangar);
    box(.06,2,.95,steel,w/2+.16,.25,d/2-2,hangar);
    box(.22,.1,.2,steel,w/2+.23,.25,d/2-1.7,hangar);
  }
  // Mission control, observation windows and roof-mounted communications dish.
  box(16,6,9,wall,42,2.1,18);box(17,.35,10,concrete,42,5.25,18);
  for(let row=0;row<2;row++) for(let col=0;col<7;col++)box(1.35,1.1,.08,glass,35.8+col*2.05,1.3+row*2,22.55);
  box(3,2,.12,steel,42,.2,22.65);
  tube(new THREE.Vector3(45,5.4,18),new THREE.Vector3(45,7.8,18),.12);
  const dish=new THREE.Mesh(new THREE.SphereGeometry(2.1,24,14,0,Math.PI*2,0,.9),wall);
  dish.position.set(45,7.4,18);dish.rotation.z=.5;dish.castShadow=true;group.add(dish);
  // Separate propellant farm: upright tanks, retaining wall, visible feed lines.
  box(17,.2,14,concrete,-10,-.8,-34);
  for(let i=0;i<3;i++) {
    const tank=new THREE.Mesh(new THREE.CapsuleGeometry(1.6,5,6,16),wall);
    tank.position.set(-16+i*5,3,-34);tank.castShadow=true;group.add(tank);
    tube(new THREE.Vector3(-16+i*5,.1,-34),new THREE.Vector3(-16+i*5,.1,-25),.16);
  }
  tube(new THREE.Vector3(-16,.1,-25),new THREE.Vector3(0,.1,-25),.2);
  tube(new THREE.Vector3(0,.1,-25),new THREE.Vector3(0,.1,-8),.2);
  for(const side of [-1,1])box(.3,1,15,concrete,-10+side*9,-.25,-34);
  for(let x=-15;x<=15;x+=5)box(.025,.01,29,rubber,x,-.767,0);
  for(let z=-14;z<=14;z+=5)box(32,.01,.025,rubber,0,-.766,z);
  // Flame trench, deflector and yellow pad perimeter markings.
  box(4,.2,16,asphalt,0,-.69,8);
  const deflector=box(3,.25,4,steel,0,-.1,4);deflector.rotation.x=-.4;
  for(const x of [-12,12])box(.2,.03,24,paint,x,-.75,0);
  for(const z of [-12,12])box(24,.03,.2,paint,0,-.75,z);
  // Lattice lightning towers.
  for(const [x,z] of [[-13,9],[13,-9]]) {
    for(const dx of [-.6,.6]) tube(new THREE.Vector3(x+dx,0,z),new THREE.Vector3(x+dx,20,z),.09);
    for(let y=0;y<20;y+=2) tube(new THREE.Vector3(x-.6,y,z),new THREE.Vector3(x+.6,y+2,z),.055);
    tube(new THREE.Vector3(x,20,z),new THREE.Vector3(x,23,z),.06);
  }
  // Low equipment shelters and a service truck establish human scale.
  box(6,2.8,4,wall,14,.5,15);box(6.4,.2,4.4,roof,14,2,15);
  const truck=new THREE.Group();group.add(truck);truck.position.set(24,0,16);
  box(1.5,1.1,2.5,wall,0,.25,0,truck);box(1.5,.8,1,paint,0,.1,1.6,truck);
  box(1.25,.45,.05,glass,0,.55,2.12,truck);
  for(const x of [-.8,.8])for(const z of [-.7,1.4]){
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.2,12),asphalt);
    wheel.rotation.z=Math.PI/2;wheel.position.set(x,-.35,z);truck.add(wheel);
  }
  // Batch static architecture by material so facade details do not add hundreds of draw calls.
  group.updateMatrixWorld(true);
  const batches=new Map<THREE.Material,THREE.Mesh[]>();
  group.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){
    const list=batches.get(o.material)??[];list.push(o);batches.set(o.material,list);
  }});
  batches.forEach((objects,material)=>{
    const parts=objects.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld));
    const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
    if(!geometry)return;
    objects.forEach(o=>{o.removeFromParent();o.geometry.dispose();});
    const combined=new THREE.Mesh(geometry,material);combined.castShadow=combined.receiveShadow=true;group.add(combined);
  });
  return group;
}
