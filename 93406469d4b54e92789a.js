import"./style.css";import*as THREE from"three";import{PointerLockControls}from"three/examples/jsm/controls/PointerLockControls";import{GLTFLoader}from"three/examples/jsm/loaders/GLTFLoader.js";import{addCrossHair}from"../controls/CrossHair.js";let camera,scene,renderer,controls;const objects=[];let raycaster,currentIntersect=null,moveForward=!1,moveBackward=!1,moveLeft=!1,moveRight=!1,canJump=!1,mixer=null,mixer2=null,prevTime=performance.now();const velocity=new THREE.Vector3,direction=new THREE.Vector3,vertex=new THREE.Vector3,color=new THREE.Color,blocker=document.getElementById("blocker"),instructions2=document.getElementById("instructions2"),blockerdetails=document.getElementById("blockerdetails"),collapsible=document.getElementById("collapsible_parent"),description=document.getElementById("limkokBio"),description2=document.getElementById("description2"),description3=document.getElementById("roopeshBio"),overlayUi=document.getElementById("limKokYong"),overlayUi2=document.getElementById("roopesh");let toggledescription=!1,toggledescription2=!1,toggledescription3=!1;const clock=new THREE.Clock;let previousTime=0,gateOpen=!1;const parameters={count:1e5,size:.01,radius:5,branches:3,spin:1,randomness:.2,randomnessPower:3,insideColor:"#ff6030",outsideColor:"#1b3984"};let geometry=null,material2=null,points=null;const mouse=new THREE.Vector2;function init(){camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,1,1e3),camera.position.y=10,camera.position.z=140,camera.position.x=10,addCrossHair(camera);const e=new THREE.AudioListener;camera.add(e);const o=new THREE.Audio(e);(new THREE.AudioLoader).load("../video/ambient.ogg",(function(e){o.setBuffer(e),o.setLoop(!0),o.setVolume(.5)})),scene=new THREE.Scene,scene.background=new THREE.Color(0),scene.fog=new THREE.Fog(16777215,0,750);const n=(new THREE.TextureLoader).load("../video/Poster.png"),t=new THREE.HemisphereLight(15658751,7829384,1);t.position.set(0,.5,2),scene.add(t),controls=new PointerLockControls(camera,document.body),window.addEventListener("click",(()=>{currentIntersect&&(console.log("click"),controls.unlock(),currentIntersect=null,dontdisplayUi())})),instructions2.addEventListener("click",(function(){controls.lock(),i.play(),r.play(),l.play(),o.play(),console.log("OpenGate."),gateOpen=!0})),description.addEventListener("click",(function(){controls.lock()})),description2.addEventListener("click",(function(){controls.lock()})),description3.addEventListener("click",(function(){controls.lock()})),controls.addEventListener("lock",(function(){instructions2.style.display="none",blockerdetails.style.display="none",collapsible.style.display="none",description.style.display="none",description2.style.display="none",description3.style.display="none",blocker.style.display="none"})),controls.addEventListener("unlock",(function(){1==toggledescription?(blocker.style.display="block",instructions2.style.display="none",blockerdetails.style.display="none",collapsible.style.display="none",description.style.display="flex",description2.style.display="none",description3.style.display="none",console.log("displaydescription")):1==toggledescription2?(blocker.style.display="block",instructions2.style.display="none",blockerdetails.style.display="none",collapsible.style.display="none",description.style.display="none",description2.style.display="flex",description3.style.display="none",console.log("displaydescription2")):1==toggledescription3?(blocker.style.display="block",instructions2.style.display="none",blockerdetails.style.display="none",collapsible.style.display="none",description.style.display="none",description2.style.display="none",description3.style.display="flex",console.log("displaydescription3")):0==toggledescription&&0==toggledescription2&&0==toggledescription3&&(blocker.style.display="block",instructions2.style.display="flex",blockerdetails.style.display="flex",collapsible.style.display="block",description.style.display="none",description2.style.display="none",description3.style.display="none",dontdisplayUi(),console.log("displayinstruction"))})),scene.add(controls.getObject()),document.addEventListener("touchstart",(function(){console.log("touch"),moveForward=!0})),document.addEventListener("touchend",(function(){console.log("end"),moveForward=!1})),document.addEventListener("keydown",(function(e){switch(e.code){case"ArrowUp":case"KeyW":moveForward=!0;break;case"ArrowLeft":case"KeyA":moveLeft=!0;break;case"ArrowDown":case"KeyS":moveBackward=!0;break;case"ArrowRight":case"KeyD":moveRight=!0;break;case"Space":!0===canJump&&(velocity.y+=350),canJump=!1}}),!1),document.addEventListener("keyup",(function(e){switch(e.code){case"ArrowUp":case"KeyW":moveForward=!1;break;case"ArrowLeft":case"KeyA":moveLeft=!1;break;case"ArrowDown":case"KeyS":moveBackward=!1;break;case"ArrowRight":case"KeyD":moveRight=!1}}),!1),raycaster=new THREE.Raycaster;const i=document.getElementById("video1"),s=new THREE.VideoTexture(i);i.src="../video/movie.mp4";const r=document.getElementById("video2"),a=new THREE.VideoTexture(r);r.src="../video/movie2.mp4";const l=document.getElementById("video3"),c=new THREE.VideoTexture(l);l.src="../video/movie3.mp4";const d=new THREE.PlaneGeometry(40,20),p=new THREE.PlaneGeometry(20,40),m=new THREE.MeshBasicMaterial({map:s,side:THREE.DoubleSide,toneMapped:!1}),y=new THREE.MeshBasicMaterial({map:a,side:THREE.DoubleSide,toneMapped:!1}),E=new THREE.MeshBasicMaterial({map:c,side:THREE.DoubleSide,toneMapped:!1}),u=new THREE.MeshBasicMaterial({map:n,side:THREE.DoubleSide,toneMapped:!1}),g=new THREE.Mesh(d,m);g.position.z=-330,g.position.y=15,g.position.x=-5,g.name="box";const w=new THREE.Mesh(d,y);w.position.z=-305,w.position.y=15,w.position.x=-45,w.rotation.y=70,w.name="box2";const v=new THREE.Mesh(d,E);v.position.z=-305,v.position.y=15,v.position.x=45,v.rotation.y=-70,v.name="box3";const b=new THREE.Mesh(d,m);b.position.z=-200,b.position.y=15,b.position.x=0,b.name="box";const h=new THREE.Mesh(d,y);h.position.z=-220,h.position.y=15,h.position.x=-45,h.rotation.y=-70,h.name="box2";const R=new THREE.Mesh(d,E);R.position.z=-220,R.position.y=15,R.position.x=45,R.rotation.y=70,R.name="box3";const T=new THREE.Mesh(d,y);T.position.z=-40,T.position.y=15,T.position.x=10;const k=new THREE.Mesh(p,u);k.position.z=20,k.position.y=25,k.position.x=10;const H=new THREE.MeshBasicMaterial({opacity:.2,transparent:!0,wireframe:!0});new THREE.MeshBasicMaterial({transparent:!0,opacity:.1,blending:THREE.AdditiveBlending,wireframe:!0}),geometry=new THREE.BufferGeometry;const f=new Float32Array(3*parameters.count),x=new Float32Array(3*parameters.count),M=new THREE.Color(parameters.insideColor),L=new THREE.Color(parameters.outsideColor);for(let e=0;e<parameters.count;e++){const o=3*e,n=Math.random()*parameters.radius,t=n*parameters.spin,i=e%parameters.branches/parameters.branches*Math.PI*2,s=Math.pow(Math.random(),parameters.randomnessPower)*(Math.random()<.5?1:-1)*parameters.randomness*n,r=Math.pow(Math.random(),parameters.randomnessPower)*(Math.random()<.5?1:-1)*parameters.randomness*n,a=Math.pow(Math.random(),parameters.randomnessPower)*(Math.random()<.5?1:-1)*parameters.randomness*n;f[o]=Math.cos(i+t)*n+s,f[o+1]=r,f[o+2]=Math.sin(i+t)*n+a;const l=M.clone();l.lerp(L,n/parameters.radius),x[o]=l.r,x[o+1]=l.g,x[o+2]=l.b}geometry.setAttribute("position",new THREE.BufferAttribute(f,3)),geometry.setAttribute("color",new THREE.BufferAttribute(x,3)),material2=new THREE.PointsMaterial({size:parameters.size,sizeAttenuation:!0,depthWrite:!1,blending:THREE.AdditiveBlending,vertexColors:!0}),points=new THREE.Points(geometry,material2),points.position.y=160,points.position.z=-250,points.scale.x=300,points.scale.y=300,points.scale.z=300,console.log("generate the galaxy"),scene.add(g,w,v,b,h,R,T,k,points),objects.push(g,w,v,b,h,R),i.loop=!0,r.loop=!0,l.loop=!0;const B=new GLTFLoader;B.load("../models/braindead.glb",(function(e){const o=e.scene;o.scale.set(1.5,1.5,1.5),o.position.set(-25,40,-350),o.rotation.set(0,-80,0),o.traverse((e=>{e.isMesh&&(e.material=H)})),scene.add(o)}),(function(e){console.log(e.loaded/e.total*100+"% loaded")}),(function(e){console.log("An error happened")})),B.load("../models/gateanimated2.glb",(function(e){const o=e.scene;o.scale.set(15,15,15),o.position.set(10,0,70),o.rotation.set(0,-139.75,0),o.traverse((e=>{e.isMesh&&(e.material.wireframe=!0)})),scene.add(o),mixer=new THREE.AnimationMixer(e.scene);const n=mixer.clipAction(e.animations[1]),t=mixer.clipAction(e.animations[0]);n.clampWhenFinished=!0,n.setLoop(THREE.LoopOnce),n.play(),t.clampWhenFinished=!0,t.setLoop(THREE.LoopOnce),t.play()}),(function(e){console.log(e.loaded/e.total*100+"% loaded")}),(function(e){console.log("An error happened")})),renderer=new THREE.WebGLRenderer({antialias:!0}),renderer.setPixelRatio(window.devicePixelRatio),renderer.setSize(window.innerWidth,window.innerHeight),document.body.appendChild(renderer.domElement),window.addEventListener("resize",onWindowResize)}function displayUi(){console.log("kyui"),overlayUi.style.display="block",overlayUi2.style.display="none"}function displayUiRP(){console.log("rpui"),overlayUi.style.display="none",overlayUi2.style.display="block"}function dontdisplayUi(){console.log("dontdisplayUi"),overlayUi.style.display="none",overlayUi2.style.display="none"}function onWindowResize(){camera.aspect=window.innerWidth/window.innerHeight,camera.updateProjectionMatrix(),renderer.setSize(window.innerWidth,window.innerHeight)}function animate(){requestAnimationFrame(animate);const e=performance.now(),o=clock.getElapsedTime(),n=o-previousTime;if(previousTime=o,1==gateOpen&&mixer&&mixer.update(n),!0===controls.isLocked){raycaster.setFromCamera(mouse,camera);const o=raycaster.intersectObjects(objects);if(o.length>0)for(var t=0;t<o.length;t++)"box"==o[t].object.name?(currentIntersect||(displayUi(),toggledescription=!0,toggledescription2=!1,toggledescription3=!1,console.log("LKY"),console.log("mouse enter")),currentIntersect=o[0]):"box2"==o[t].object.name?(currentIntersect||(toggledescription=!1,toggledescription2=!0,toggledescription3=!1,console.log("box2"),console.log("mouse enter")),currentIntersect=o[0]):"box3"==o[t].object.name&&(currentIntersect||(displayUiRP(),toggledescription=!1,toggledescription2=!1,toggledescription3=!0,console.log("Roopesh"),console.log("mouse enter")),currentIntersect=o[0]);else currentIntersect&&(console.log("leave"),dontdisplayUi(),blocker.style.display="none",instructions2.style.display="none",blockerdetails.style.display="none",description.style.display="none",description2.style.display="none",description3.style.display="none",toggledescription=!1,toggledescription2=!1,toggledescription3=!1),currentIntersect=null;const n=(e-prevTime)/1e3;velocity.x-=10*velocity.x*n,velocity.z-=10*velocity.z*n,direction.z=Number(moveForward)-Number(moveBackward),direction.x=Number(moveRight)-Number(moveLeft),direction.normalize(),(moveForward||moveBackward)&&(velocity.z-=400*direction.z*n),(moveLeft||moveRight)&&(velocity.x-=400*direction.x*n),controls.moveRight(-velocity.x*n),controls.moveForward(-velocity.z*n),controls.getObject().position.y+=velocity.y*n}prevTime=e,renderer.render(scene,camera)}document.addEventListener("movemouse",(()=>{mouse.x=MouseEvent.clientX/window.innerWidth*2-1,mouse.y=MouseEvent.clientY/window.innerHeight*2+1})),init(),animate();