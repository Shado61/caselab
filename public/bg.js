/* 3D background: floating neon cases and crystals (three.js from cdnjs). Purely decorative. */
(function(){
  if(!window.THREE||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cv=document.getElementById('bg3d');if(!cv)return;
  let renderer;try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){return}
  renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x07060f,.055);
  const cam=new THREE.PerspectiveCamera(55,1,.1,100);cam.position.set(0,0,14);
  scene.add(new THREE.AmbientLight(0x6a5cff,.6));
  const l1=new THREE.PointLight(0xff3bd4,2.2,40);l1.position.set(-8,6,8);scene.add(l1);
  const l2=new THREE.PointLight(0x39f3ff,2.2,40);l2.position.set(8,-4,6);scene.add(l2);
  const cols=[0x8b5cff,0x39f3ff,0xff3bd4,0xffc24a];
  const objs=[];
  function crate(c){
    const g=new THREE.Group();
    const box=new THREE.Mesh(new THREE.BoxGeometry(1.6,1,1),new THREE.MeshStandardMaterial({color:0x151226,metalness:.7,roughness:.35,emissive:c,emissiveIntensity:.08}));
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry),new THREE.LineBasicMaterial({color:c}));
    const band=new THREE.Mesh(new THREE.BoxGeometry(1.64,.08,1.04),new THREE.MeshBasicMaterial({color:c}));
    g.add(box,edges,band);return g;
  }
  function gem(c){
    const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,0),new THREE.MeshStandardMaterial({color:c,metalness:.3,roughness:.1,emissive:c,emissiveIntensity:.25,flatShading:true,transparent:true,opacity:.85}));
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.35})));return m;
  }
  for(let i=0;i<18;i++){
    const c=cols[i%cols.length],o=i%3===0?gem(c):crate(c);
    o.position.set((Math.random()-.5)*26,(Math.random()-.5)*16,-Math.random()*16);
    o.rotation.set(Math.random()*3,Math.random()*3,0);
    const s=.6+Math.random()*1.1;o.scale.set(s,s,s);
    o.userData={vx:(Math.random()-.5)*.004,vy:(Math.random()-.5)*.004,ph:Math.random()*6.28};
    scene.add(o);objs.push(o);
  }
  const pg=new THREE.BufferGeometry(),N=600,pa=new Float32Array(N*3);
  for(let i=0;i<N;i++){pa[i*3]=(Math.random()-.5)*50;pa[i*3+1]=(Math.random()-.5)*30;pa[i*3+2]=-Math.random()*30}
  pg.setAttribute('position',new THREE.BufferAttribute(pa,3));
  const stars=new THREE.Points(pg,new THREE.PointsMaterial({color:0xb9a8ff,size:.06,transparent:true,opacity:.8}));scene.add(stars);
  /* perspective grid floor */
  const grid=new THREE.GridHelper(80,60,0x8b5cff,0x2a1f55);grid.position.y=-7;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
  let mx=0,my=0,sy=0;
  addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
  addEventListener('scroll',()=>{sy=scrollY},{passive:true});
  function size(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
  addEventListener('resize',size);size();
  let t=0,run=true;document.addEventListener('visibilitychange',()=>{run=!document.hidden;if(run)loop()});
  function loop(){
    if(!run)return;requestAnimationFrame(loop);t+=.01;
    objs.forEach(o=>{o.rotation.x+=.003;o.rotation.y+=.004;o.position.x+=o.userData.vx;o.position.y+=Math.sin(t+o.userData.ph)*.004;
      if(o.position.x>14)o.position.x=-14;if(o.position.x<-14)o.position.x=14});
    stars.rotation.y=t*.01;grid.position.z=(t*2)%1.33;
    cam.position.x+=(mx*2-cam.position.x)*.04;cam.position.y+=(-my*1.4-sy*.002-cam.position.y)*.04;cam.lookAt(0,0,0);
    renderer.render(scene,cam);
  }
  loop();
})();
