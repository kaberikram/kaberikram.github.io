import"./style.css";import*as THREE from"three";import{PointerLockControls}from"three/examples/jsm/controls/PointerLockControls";import{GLTFLoader}from"three/examples/jsm/loaders/GLTFLoader.js";import{addCrossHair}from"../controls/CrossHair.js";let camera,scene,renderer,controls;const objects=[];let raycaster,currentIntersect=null,moveForward=!1,moveBackward=!1,moveLeft=!1,moveRight=!1,canJump=!1,prevTime=performance.now();const velocity=new THREE.Vector3,direction=new THREE.Vector3,vertex=new THREE.Vector3,color=new THREE.Color,blocker=document.getElementById("blocker"),instructions2=document.getElementById("instructions2"),description=document.getElementById("description"),description2=document.getElementById("description2"),description3=document.getElementById("description3");var toggledescription=!1,toggledescription2=!1,toggledescription3=!1;function init(){camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,1,1e3),camera.position.y=10,camera.position.z=100,camera.position.x=10,addCrossHair(camera),scene=new THREE.Scene,scene.background=new THREE.Color(0),scene.fog=new THREE.Fog(16777215,0,750);const e=new THREE.HemisphereLight(15658751,7829384,1);e.position.set(0,.5,2),scene.add(e),controls=new PointerLockControls(camera,document.body),instructions2.addEventListener("click",(function(){controls.lock(),s.play(),l.play(),d.play()})),description.addEventListener("click",(function(){controls.lock()})),description2.addEventListener("click",(function(){controls.lock()})),description3.addEventListener("click",(function(){controls.lock()})),controls.addEventListener("lock",(function(){instructions2.style.display="none",description.style.display="none",description2.style.display="none",description3.style.display="none",blocker.style.display="none"})),controls.addEventListener("unlock",(function(){1==toggledescription?(blocker.style.display="block",instructions2.style.display="none",description.style.display="flex",description2.style.display="none",description3.style.display="none",console.log("displaydescription")):1==toggledescription2?(blocker.style.display="block",description.style.display="none",description2.style.display="flex",description3.style.display="none",console.log("displaydescription2")):1==toggledescription3?(blocker.style.display="block",description.style.display="none",description2.style.display="none",description3.style.display="flex",console.log("displaydescription3")):0==toggledescription&&0==toggledescription2&&0==toggledescription3&&(blocker.style.display="block",instructions2.style.display="",description.style.display="none",description2.style.display="none",description3.style.display="none",console.log("displayinstruction"))})),scene.add(controls.getObject()),document.addEventListener("touchstart",(function(){console.log("touch"),moveForward=!0})),document.addEventListener("touchend",(function(){console.log("end"),moveForward=!1})),document.addEventListener("keydown",(function(e){switch(e.code){case"ArrowUp":case"KeyW":moveForward=!0;break;case"ArrowLeft":case"KeyA":moveLeft=!0;break;case"ArrowDown":case"KeyS":moveBackward=!0;break;case"ArrowRight":case"KeyD":moveRight=!0;break;case"Space":case"Space":!0===canJump&&(velocity.y+=350),canJump=!1}}),!1),document.addEventListener("keyup",(function(e){switch(e.code){case"ArrowUp":case"KeyW":moveForward=!1;break;case"ArrowLeft":case"KeyA":moveLeft=!1;break;case"ArrowDown":case"KeyS":moveBackward=!1;break;case"ArrowRight":case"KeyD":moveRight=!1}}),!1),raycaster=new THREE.Raycaster(new THREE.Vector3,new THREE.Vector3(0,-1,0),0,10);let o=new THREE.PlaneGeometry(2e3,2e3,100,100);o.rotateX(-Math.PI/2);let t=o.attributes.position;for(let e=0,o=t.count;e<o;e++)vertex.fromBufferAttribute(t,e),vertex.x+=20*Math.random()-10,vertex.y+=2*Math.random(),vertex.z+=20*Math.random()-10,t.setXYZ(e,vertex.x,vertex.y,vertex.z);o=o.toNonIndexed(),t=o.attributes.position;const n=[];for(let e=0,o=t.count;e<o;e++)color.setHSL(.3*Math.random()+.5,.75,.25*Math.random()+.75),n.push(color.r,color.g,color.b);o.setAttribute("color",new THREE.Float32BufferAttribute(n,3));const i=new THREE.MeshBasicMaterial({wireframe:!0}),r=new THREE.Mesh(o,i);scene.add(r);const s=document.getElementById("video1"),c=new THREE.VideoTexture(s);s.src="../video/movie.mp4";const l=document.getElementById("video2"),a=new THREE.VideoTexture(l);l.src="../video/movie2.mp4";const d=document.getElementById("video3"),p=new THREE.VideoTexture(d);d.src="../video/movie3.mp4";const y=new THREE.PlaneGeometry(40,20),m=new THREE.MeshBasicMaterial({map:c,side:THREE.DoubleSide,toneMapped:!1}),E=new THREE.MeshBasicMaterial({map:a,side:THREE.DoubleSide,toneMapped:!1}),w=new THREE.MeshBasicMaterial({map:p,side:THREE.DoubleSide,toneMapped:!1}),g=new THREE.Mesh(y,m);g.position.z=-70,g.position.y=15,g.position.x=-5;const u=new THREE.Mesh(y,E);u.position.z=-45,u.position.y=15,u.position.x=-45,u.rotation.y=70;const v=new THREE.Mesh(y,w);v.position.z=-45,v.position.y=15,v.position.x=45,v.rotation.y=-70;const b=new THREE.BoxGeometry(20,10,10),R=new THREE.BoxGeometry(20,1,10),h=new THREE.MeshBasicMaterial({color:4095,opacity:0,transparent:!0}),H=new THREE.MeshBasicMaterial({color:8569262,wireframe:!0}),T=new THREE.Mesh(b,h);T.position.y=8,T.position.z=-60,T.position.x=-5,T.name="box";const x=new THREE.Mesh(R,H);x.position.y=2,x.position.z=-60,x.position.x=-5;const f=new THREE.Mesh(b,h);f.position.z=-40,f.position.y=8,f.position.x=40,f.rotation.y=-70,f.name="box2";const k=new THREE.Mesh(R,H);k.position.z=-40,k.position.y=2,k.position.x=40,k.rotation.y=-70;const M=new THREE.Mesh(b,h);M.position.z=-40,M.position.y=8,M.position.x=-40,M.rotation.y=70,M.name="box3";const L=new THREE.Mesh(R,H);L.position.z=-40,L.position.y=2,L.position.x=-40,L.rotation.y=70,scene.add(g,u,v,T,f,M,x,k,L),objects.push(T,f,M),s.loop=!0,l.loop=!0,d.loop=!0,(new GLTFLoader).load("../models/brain.glb",(function(e){const o=e.scene;o.scale.set(.6,.6,.6),o.position.set(-10,-20,-90),o.rotation.set(0,-80,0),scene.add(o)}),(function(e){console.log(e.loaded/e.total*100+"% loaded")}),(function(e){console.log("An error happened")})),renderer=new THREE.WebGLRenderer({antialias:!0}),renderer.setPixelRatio(window.devicePixelRatio),renderer.setSize(window.innerWidth,window.innerHeight),document.body.appendChild(renderer.domElement),window.addEventListener("resize",onWindowResize)}function onWindowResize(){camera.aspect=window.innerWidth/window.innerHeight,camera.updateProjectionMatrix(),renderer.setSize(window.innerWidth,window.innerHeight)}function animate(){requestAnimationFrame(animate);const e=performance.now();if(!0===controls.isLocked){raycaster.ray.origin.copy(controls.getObject().position),raycaster.ray.origin.y+=5;const t=raycaster.intersectObjects(objects);if(t.length>0)for(var o=0;o<t.length;o++)"box"==t[o].object.name?(currentIntersect||(controls.unlock(),toggledescription=!0,toggledescription2=!1,toggledescription3=!1,console.log("box"),console.log("mouse enter")),currentIntersect=t[0]):"box2"==t[o].object.name?(currentIntersect||(controls.unlock(),toggledescription=!1,toggledescription2=!0,toggledescription3=!1,console.log("box2"),console.log("mouse enter")),currentIntersect=t[0]):"box3"==t[o].object.name&&(currentIntersect||(controls.unlock(),toggledescription=!1,toggledescription2=!1,toggledescription3=!0,console.log("box3"),console.log("mouse enter")),currentIntersect=t[0]);else currentIntersect&&(console.log("leave"),blocker.style.display="none",instructions2.style.display="none",description.style.display="none",description2.style.display="none",description3.style.display="none",toggledescription=!1,toggledescription2=!1,toggledescription3=!1),currentIntersect=null;const n=(e-prevTime)/1e3;velocity.x-=10*velocity.x*n,velocity.z-=10*velocity.z*n,direction.z=Number(moveForward)-Number(moveBackward),direction.x=Number(moveRight)-Number(moveLeft),direction.normalize(),(moveForward||moveBackward)&&(velocity.z-=400*direction.z*n),(moveLeft||moveRight)&&(velocity.x-=400*direction.x*n),controls.moveRight(-velocity.x*n),controls.moveForward(-velocity.z*n),controls.getObject().position.y+=velocity.y*n}prevTime=e,renderer.render(scene,camera)}init(),animate();