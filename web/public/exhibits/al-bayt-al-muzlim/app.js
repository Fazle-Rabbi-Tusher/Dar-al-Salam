import {SanctuaryRenderer} from './renderer.js';
const $=id=>document.getElementById(id);
let renderer,detail='micro',toastTimer,walking=false,stepTimer,previewState='',selectedInstrument=null,clockTimer,experimentTimer,clockPlayback,lastState,markerContext=true,activeMirror='mirror-plane',thumbnailFamily='unset',thumbnailTimer;
const views={workshop:'THE WORKING ROOM',interior:'INSIDE THE DARK ROOM',roomplan:'ROOM PLAN',walk:'INSIDE THE COURTYARD',layout:'COURTYARD & SURROUNDING BUILDINGS',courtyard:'COURTYARD STUDY',pinhole:'VIEW FROM THE PINHOLE',overview:'ROOM OVERVIEW',top:'SITE PLAN',window:'THE APERTURE',screen:'THE PROJECTION SCREEN',bench:'THE OPTICAL BENCH',lectern:'THE GEOMETRY LECTERN',shelves:'THE INSTRUMENT SHELVES',free:'FREE EXPLORATION'};
const focus={workshop:['FOUR WORKING STATIONS','Find the seven mirrors, sighting tubes, astronomy tools and water clock around the room. Select a label to use that station. The central floor and pinhole-to-screen path stay clear. Choose Inside to walk between the work areas.'],overview:['THE COMPLETE CHAMBER','Thick masonry encloses a timber workbench, a geometry lectern, and shelves of instruments. The cutaway lets you inspect the interior from every angle.'],top:['A PLAN OF THE ROOM & COURTYARD','The sunlit courtyard, pinhole and receiving screen share one optical axis. Inside, the bench, lectern and shelves form an imagined workspace around that path.'],window:['01 · THE APERTURE','A wooden shutter and brass pinhole plate admit a small cone of daylight. Change the aperture width to explore the balance between brightness and definition.'],screen:['02 · THE SCREEN','A taut white canvas catches the inverted courtyard. Move the screen along the optical axis and compare the outside scene with the image formed inside.'],bench:['03 · THE OPTICAL BENCH','A heavy grooved timber surface holds glass, water vessels, curved optical forms, and graduated scales. Fine highlights make their different materials visible.'],lectern:['04 · THE GEOMETRY LECTERN','An angled board, coloured pegs, rulers, compasses and inkwells connect observation with geometric reasoning. The furniture and arrangement are imagined.'],shelves:['05 · THE INSTRUMENT SHELVES','Glass vessels, water flasks and parchment occupy the darker corners. Hanging astrolabes supply period context; this display does not establish personal ownership.']};
Object.assign(focus,{interior:['ROOM TO STUDY','An enlarged chamber with 2.25 times the original floor area. The workbench, drafting area and storage have their own space, with clear routes between them and an open path from the pinhole to the screen. Drag to look around; use the direction buttons or W A S D to walk.'],roomplan:['SPACE BETWEEN THE WORK','The overhead plan reveals the clear central floor, separate workstations and unobstructed optical path. Larger, clearly separated instrument stations occupy the perimeter, with an open central floor.'],walk:['AT GROUND LEVEL','Walk between the pool and the shaded galleries. Roofed stone buildings enclose the courtyard, with recessed openings, worn paving and surrounding streets. Drag to look around; use the direction buttons or W A S D to move.'],layout:['THE COMPLETE LOCATION','A larger courtyard, four-bay gallery, deep stone hall and articulated neighbouring houses form one continuous setting with the enlarged dark chamber. Explore the architecture from outside, or select Inside or Court to walk through either space.'],courtyard:['00 · THE COURTYARD','A turquoise basin sits between substantial stone wings. Deep arches shelter the gallery; timber shutters, thresholds, planters and weathered walls give the place scale and depth.'],pinhole:['06 · THROUGH THE OPENING','Look out from the pinhole toward the upright courtyard. The screen inside displays this same scene upside down; the demonstration uses illustrative framing.']});
Object.assign(views,{mirrors:'SEVEN MIRROR FORMS',tubes:'SIGHTING TUBES',astronomy:'ASTRONOMICAL INSTRUMENTS',waterclock:'THE 24-HOUR WATER CLOCK'});
const mirrorNames={'mirror-plane':'Plane','mirror-spherical-convex':'Convex spherical','mirror-spherical-concave':'Concave spherical','mirror-cylindrical-convex':'Convex cylindrical','mirror-cylindrical-concave':'Concave cylindrical','mirror-conical-convex':'Convex conical','mirror-conical-concave':'Concave conical'};
Object.assign(focus,{mirrors:['08 · SEVEN MIRROR FORMS','Polished iron surfaces: plane, spherical, cylindrical and conical, with concave and convex versions of each curved family. Choose a form, change the incoming beam angle, and see the rays reflect from its surface.'],tubes:['09 · SIGHTING TUBES','Lensless copper tubes with a funnel eyepiece and aligned sight apertures. Turn the mounted tube to bring its open sight line onto the fixed target.'],astronomy:['10 · ASTRONOMICAL OBSERVATION','A meridian quadrant, sighting alidade and gnomon board connect observation to geometry. Use the indoor angle and shadow exercise; actual celestial observations require outdoor conditions.'],waterclock:['11 · THE WATER CLOCK','A reconstruction with a sinking cylinder, guides, cord, pulleys and a 24-division dial. Run the clock, pause it, or choose any point in its 24-hour cycle.']});
for(const [key,name] of Object.entries(mirrorNames)){views[key]=name.toUpperCase()+' MIRROR';focus[key]=['08 · '+name.toUpperCase(),'Change the incoming beam angle to trace reflected rays on this surface. Compare its behaviour with another mirror form, or drag to inspect the geometry.'];}
function clockReadout(value){const minutes=Math.round(value*60),hours=Math.floor(minutes/60);return String(hours).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
function previews(){if(!renderer)return;for(const [id,method] of [['courtyard-preview','getCourtyardCanvas'],['projection-preview','getProjectionCanvas']]){if(typeof renderer[method]!=='function')continue;const source=renderer[method]();if(!source)continue;const cv=$(id),c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);c.imageSmoothingEnabled=false;c.drawImage(source,0,0,cv.width,cv.height);}}
const stationNames={mirrors:'Seven mirrors',tubes:'Sighting tubes',astronomy:'Astronomy tools',waterclock:'Water clock'};
const mirrorBehaviour={
 'mirror-plane':'A plane surface preserves the separation of parallel rays.',
 'mirror-spherical-convex':'The convex spherical surface spreads the reflected beam.',
 'mirror-spherical-concave':'The concave spherical surface brings near-axis rays together.',
 'mirror-cylindrical-convex':'The cylinder spreads rays across one curved direction.',
 'mirror-cylindrical-concave':'The cylinder concentrates rays across one curved direction.',
 'mirror-conical-convex':'The cone redirects light according to its sloping surface.',
 'mirror-conical-concave':'The hollow cone redirects light according to its sloping surface.'
};
function scrollToStage(){ $('stage').scrollIntoView({behavior:'instant',block:'start'}); }
function pauseClock(){clearInterval(clockPlayback);clockPlayback=undefined;$('clock-play').textContent='▶ Run clock';$('clock-play').setAttribute('aria-pressed','false');if(lastState)updateExperiment(lastState);}
function resetRoom(){pauseClock();clearTimeout(clockTimer);clearTimeout(experimentTimer);activeMirror='mirror-plane';for(const [id,value] of Object.entries({'mirror-angle':15,'tube-angle':14,'quadrant-angle':35,'sun-altitude':55}))$(id).value=value;renderer.reset();}
function demoOptions(){
 if(selectedInstrument==='mirrors')return{kind:'mirror',mirrorId:activeMirror,angle:Number($('mirror-angle').value)};
 if(selectedInstrument==='tubes')return{kind:'tube',tubeAngle:Number($('tube-angle').value)};
 if(selectedInstrument==='astronomy')return{kind:'astronomy',altitude:Number($('quadrant-angle').value),sunAltitude:Number($('sun-altitude').value)};
 return null;
}
function applyDemo(){const options=demoOptions();if(options)renderer.setInstrumentDemo(options);}
function focusMirror(){const current=$('mirror-form').value,angle=Number($('mirror-angle').value);activeMirror=mirrorNames[current]?current:activeMirror;renderer.preset(activeMirror);renderer.setInstrumentDemo({kind:'mirror',mirrorId:activeMirror,angle});}
function activateView(view){
 stopWalking();clearTimeout(experimentTimer);if(view!=='waterclock')pauseClock();
 if(mirrorNames[view])activeMirror=view;
 renderer.preset(view);
 if(view==='mirrors'||mirrorNames[view]||view==='tubes'||view==='astronomy')applyDemo();
 if(view==='mirrors'||mirrorNames[view]||['tubes','astronomy','waterclock','workshop','layout','walk','courtyard','interior'].includes(view))scrollToStage();
}
function updateMarkers(markers=[]){
 const show=!!lastState?.cutaway&&markerContext&&!selectedInstrument;
 $('station-markers').hidden=!show;
 if(!show)return;
 const canvas=$('room-canvas'),width=canvas.clientWidth,height=canvas.clientHeight,placed=[];
 for(const marker of markers){
  const button=document.querySelector('[data-station="'+marker.id+'"]');if(!button)continue;
  button.hidden=!marker.visible;if(!marker.visible)continue;
  const half=button.offsetWidth/2,x=Math.max(half+7,Math.min(width-half-48,marker.x));
  let y=Math.max(76,Math.min(height-50,marker.y-20));
  for(const pos of placed)if(Math.abs(pos.x-x)<half+pos.half+6&&Math.abs(pos.y-y)<42)y=Math.max(76,y-44);
  button.style.left=x+'px';button.style.top=y+'px';placed.push({x,y,half});
 }
}
function fillInstrumentPreviews(){
 const canvases=[...document.querySelectorAll('[data-instrument-preview]')];
 function next(){
  const cv=canvases.shift();if(!cv||typeof renderer?.getInstrumentThumbnail!=='function')return;
  const rect=cv.getBoundingClientRect();
  if(rect.width>1&&rect.height>1){
   const scale=Math.min(window.devicePixelRatio||1,2,600/rect.width,340/rect.height),width=Math.round(rect.width*scale),height=Math.round(rect.height*scale),key=width+'x'+height;
   if(cv.dataset.renderedSize!==key)try{const source=renderer.getInstrumentThumbnail(cv.dataset.instrumentPreview,{width,height});if(source){cv.width=width;cv.height=height;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(source,0,0,width,height);cv.dataset.renderedSize=key;cv.classList.add('ready');}}catch(error){console.warn('Instrument preview unavailable:',cv.dataset.instrumentPreview,error.message);}
  }
  if(canvases.length)requestAnimationFrame(next);
 }
 requestAnimationFrame(next);
}
window.addEventListener('resize',()=>{clearTimeout(thumbnailTimer);thumbnailTimer=setTimeout(fillInstrumentPreviews,180);});
function fitInstrument(){
 const view=selectedInstrument==='mirrors'?(mirrorNames[lastState?.view]?lastState.view:activeMirror):selectedInstrument;
 if(!view)return;const options=demoOptions();renderer.preset(view);if(options)renderer.setInstrumentDemo(options);
}
function updateExperiment(state){
 const selected=selectedInstrument,m=state.measurements||{},options=state.instrumentDemo||{};
 $('station-experiment').hidden=!selected;
 $('instrument-live').hidden=$('fit-instrument').hidden=!selected;
 $('instrument-live-title').textContent=selected==='mirrors'?(state.view==='mirrors'?'Seven mirror forms':(mirrorNames[activeMirror]||'Plane')+' mirror'):({tubes:'Sighting tube',astronomy:'Quadrant & gnomon',waterclock:'24-hour water clock'}[selected]||'');
 for(const [id,kind] of [['mirror-experiment','mirrors'],['tube-experiment','tubes'],['astronomy-experiment','astronomy']])$(id).hidden=selected!==kind;
 const content={
  mirrors:['Make light change direction.','Select a mirror and change the beam angle. Gold rays show incoming light; teal rays show where the surface sends it.'],
  tubes:['Bring the target into line.','Adjust the mounted tube until its open sight line meets the fixed target. The readout shows your alignment error.'],
  astronomy:['Measure angle and shadow.','Turn the quadrant’s sighting rule. Then change the demonstration light’s altitude and compare the gnomon’s shadow.'],
  waterclock:['Set time in motion.','Run a full day in seconds, pause to inspect the mechanism, or choose an elapsed time with the slider.']
 }[selected];
 if(content){$('experiment-title').textContent=content[0];$('experiment-instruction').textContent=content[1];}
 if(selected==='mirrors'){
  const angle=Number.isFinite(options.angle)?options.angle:Number($('mirror-angle').value);$('mirror-angle').value=angle;$('mirror-angle-value').textContent=angle+'°';
  if(Number.isFinite(m.incidenceAngle)&&Number.isFinite(m.reflectionAngle)){$('instrument-live-reading').textContent='In '+m.incidenceAngle.toFixed(1)+'°  /  Out '+m.reflectionAngle.toFixed(1)+'°';}
  if(Number.isFinite(m.incidenceAngle)&&Number.isFinite(m.reflectionAngle))$('mirror-reading').textContent='Incidence '+m.incidenceAngle.toFixed(1)+'° · Reflection '+m.reflectionAngle.toFixed(1)+'°. '+(mirrorBehaviour[activeMirror]||'');
 }
 if(selected==='tubes'){
  const angle=Number.isFinite(options.tubeAngle)?options.tubeAngle:Number($('tube-angle').value);$('tube-angle').value=angle;$('tube-angle-value').textContent=angle+'°';
  if(Number.isFinite(m.angularError)){$('instrument-live-reading').textContent=m.aligned?'On target · aligned':Math.abs(m.angularError).toFixed(1)+'° off target';$('tube-status').textContent=m.aligned?'Aligned ✓':'Adjust the tube';$('tube-status').classList.toggle('aligned',!!m.aligned);$('tube-reading').textContent='Angular error '+Math.abs(m.angularError).toFixed(1)+'° · '+(m.aligned?'The open bore and target share one sight line.':'The sight line misses the fixed target.');}
 }
 if(selected==='astronomy'){
  const angle=Number.isFinite(options.altitude)?options.altitude:Number($('quadrant-angle').value),sun=Number.isFinite(options.sunAltitude)?options.sunAltitude:Number($('sun-altitude').value);
  $('quadrant-angle').value=angle;$('quadrant-angle-value').textContent=angle+'°';$('sun-altitude').value=sun;$('sun-altitude-value').textContent=sun+'°';
  if(Number.isFinite(m.shadowHeightRatio))$('instrument-live-reading').textContent=angle+'° sight angle  /  '+m.shadowHeightRatio.toFixed(2)+'× shadow';
  if(Number.isFinite(m.shadowHeightRatio))$('astronomy-reading').textContent='Sighting angle '+angle+'° · Shadow '+m.shadowHeightRatio.toFixed(2)+' × gnomon height. Higher light makes a shorter shadow.';
 }
 if(selected==='waterclock'&&Number.isFinite(state.clockHour))$('instrument-live-reading').textContent=clockReadout(state.clockHour)+' / 24:00'+(clockPlayback?' · Running':'');
 if(Number.isFinite(state.clockHour))$('clock-progress').textContent=(state.clockHour/24*100).toFixed(0)+'% of the 24-hour cycle'+(clockPlayback?' · Running':'');
}
function update(state){
  lastState=state;if(state.view!=='free')markerContext=['workshop','overview','roomplan'].includes(state.view);
  $('zoom-value').textContent=Math.round(state.zoom*100)+'%';$('view-label').textContent=views[state.view]||views.free;
  document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===state.view&&!state.auto;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  if(state.view!=='free')selectedInstrument=state.view==='mirrors'||state.view.startsWith('mirror-')?'mirrors':['tubes','astronomy','waterclock'].includes(state.view)?state.view:null;
  for(const b of document.querySelectorAll('[data-instrument]')){const active=b.dataset.instrument===selectedInstrument;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
  $('mirror-tools').hidden=selectedInstrument!=='mirrors';if(state.view==='mirrors'||mirrorNames[state.view])$('mirror-form').value=state.view;if(mirrorNames[state.view])activeMirror=state.view;
  $('clock-study').hidden=$('clock-controls').hidden=selectedInstrument!=='waterclock';$('stage').classList.toggle('instrument-stage',!!selectedInstrument);$('interactive-workspace').classList.toggle('has-instrument',!!selectedInstrument);
  const heading=['LIGHT & PROJECTION','The pinhole experiment.','Adjust the opening, screen and inspection light.'];
  $('inspector-kicker').textContent=heading[0];$('inspector-title').textContent=heading[1];$('inspector-subtitle').textContent=heading[2];
  if(Number.isFinite(state.clockHour)){$('clock-hour').value=state.clockHour;$('clock-hour-value').textContent=Number(state.clockHour.toFixed(2))+' h';$('clock-time').textContent=clockReadout(state.clockHour);}
  $('auto-rotate').classList.toggle('active',state.auto);$('auto-rotate').setAttribute('aria-pressed',String(state.auto));$('auto-rotate').setAttribute('aria-label',state.auto?'Stop automatic rotation':'Start automatic rotation');
  $('sunlight-toggle').checked=state.sunlight;$('cutaway-toggle').checked=state.cutaway;$('rays-toggle').checked=state.rays;
  for(const [input,output,value] of [['aperture','aperture-value',state.aperture],['screen-distance','distance-value',state.screenDistance],['exposure','exposure-value',state.exposure]]){if(Number.isFinite(value)){$(input).value=Math.round(value*100);$(output).textContent=Math.round(value*100)+'%';}}
  walking=!!state.canWalk;const inside=state.navigationArea==='room';$('stage').classList.toggle('walk-mode',walking);$('stage').classList.toggle('interior-mode',inside);$('walk-controls').hidden=!walking;$('walk-controls').setAttribute('aria-label',inside?'Walk through the dark room':'Walk through the courtyard');
  $('scene-mode-label').textContent=walking?(inside?'INSIDE THE DARK ROOM':'AT GROUND LEVEL'):state.cutaway?'CUTAWAY STUDY':'COMPLETE ARCHITECTURE';$('ray-note').hidden=(walking&&!inside)||!(state.sunlight&&state.rays);
  $('rotate-hint').textContent=walking?'Drag to look · direction buttons to walk':markerContext?'Select a station · drag to explore':'Drag to rotate · scroll or pinch to zoom';
  const inspection=state.exposure>.25;for(const [id,active] of [['study-mode',inspection],['experiment-mode',!inspection]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));}
  if(focus[state.view]){$('focus-number').textContent=focus[state.view][0];$('focus-text').textContent=focus[state.view][1];}
  updateExperiment(state);if(thumbnailFamily!==selectedInstrument){thumbnailFamily=selectedInstrument;requestAnimationFrame(fillInstrumentPreviews);}if(renderer?.getStationMarkers)updateMarkers(renderer.getStationMarkers());
  const signature=[state.aperture,state.sunlight,state.screenDistance].join(':');if(renderer&&signature!==previewState){previewState=signature;previews();}
}
function stopWalking(){clearInterval(stepTimer);stepTimer=undefined;}
function step(direction){if(!walking||!renderer?.move)return;const vectors={forward:[.32,0],back:[-.32,0],left:[0,-.28],right:[0,.28]};renderer.move(...vectors[direction]);}
document.querySelectorAll('[data-step]').forEach(button=>{
  button.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();stopWalking();button.setPointerCapture?.(event.pointerId);step(button.dataset.step);stepTimer=setInterval(()=>step(button.dataset.step),160);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,stopWalking);
  button.addEventListener('click',event=>{if(event.detail===0)step(button.dataset.step);});
});
window.addEventListener('blur',()=>{stopWalking();pauseClock();});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopWalking();pauseClock();}});
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
for(const id of ['about-button','sources-button'])$(id).addEventListener('click',()=>$('about-dialog').showModal());
$('about-dialog').addEventListener('click',e=>{if(e.target===$('about-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
try{
  renderer=new SanctuaryRenderer($('room-canvas'),update);$('loading').classList.add('ready');$('loading').setAttribute('aria-hidden','true');
  renderer.setFrameCallback(updateMarkers);fillInstrumentPreviews();
  $('fit-instrument').addEventListener('click',fitInstrument);
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>activateView(b.dataset.view)));
  $('mirror-form').addEventListener('change',e=>activateView(e.target.value));
  $('mirror-test').addEventListener('click',()=>{focusMirror();scrollToStage();});
  $('parallel-beam').addEventListener('click',()=>{$('mirror-angle').value=0;focusMirror();scrollToStage();});
  for(const id of ['mirror-angle','tube-angle','quadrant-angle','sun-altitude']){
    $(id).addEventListener('input',e=>{const outputs={'mirror-angle':'mirror-angle-value','tube-angle':'tube-angle-value','quadrant-angle':'quadrant-angle-value','sun-altitude':'sun-altitude-value'};$(outputs[id]).textContent=e.target.value+'°';clearTimeout(experimentTimer);experimentTimer=setTimeout(()=>{if(id==='mirror-angle'&&lastState.view==='mirrors')focusMirror();else applyDemo();},70);});
    $(id).addEventListener('change',()=>{clearTimeout(experimentTimer);if(id==='mirror-angle'&&lastState.view==='mirrors')focusMirror();else applyDemo();});
  }
  $('tube-align').addEventListener('click',()=>{$('tube-angle').value=22;applyDemo();});
  $('tube-misalign').addEventListener('click',()=>{$('tube-angle').value=14;applyDemo();});
  $('sun-low').addEventListener('click',()=>{$('sun-altitude').value=40;applyDemo();});
  $('sun-high').addEventListener('click',()=>{$('sun-altitude').value=80;applyDemo();});
  $('clock-play').addEventListener('click',()=>{
    if(clockPlayback){pauseClock();updateExperiment(lastState);return;}
    if((lastState.clockHour||0)>=24)renderer.setClockHour(0);
    $('clock-play').textContent='Ⅱ Pause clock';$('clock-play').setAttribute('aria-pressed','true');
    let playbackHour=lastState.clockHour||0,lastTick=performance.now();
    clockPlayback=setInterval(()=>{const now=performance.now();playbackHour+=(now-lastTick)/1000*Number($('clock-speed').value);lastTick=now;const next=Math.min(24,Math.round(playbackHour*4)/4);renderer.setClockHour(next);if(next>=24){pauseClock();updateExperiment(lastState);}},250);
  });
  $('clock-restart').addEventListener('click',()=>{pauseClock();renderer.setClockHour(0);});
  $('clock-hour').addEventListener('input',e=>{pauseClock();const value=Number(e.target.value);$('clock-hour-value').textContent=value+' h';$('clock-time').textContent=clockReadout(value);clearTimeout(clockTimer);clockTimer=setTimeout(()=>renderer.setClockHour(value),80);});
  $('clock-hour').addEventListener('change',e=>{clearTimeout(clockTimer);renderer.setClockHour(Number(e.target.value));});
  $('sunlight-toggle').addEventListener('change',e=>renderer.setSunlight(e.target.checked));$('cutaway-toggle').addEventListener('change',e=>renderer.setCutaway(e.target.checked));$('rays-toggle').addEventListener('change',e=>renderer.setRays(e.target.checked));
  $('aperture').addEventListener('input',e=>renderer.setAperture(Number(e.target.value)/100));$('screen-distance').addEventListener('input',e=>renderer.setScreenDistance(Number(e.target.value)/100));$('exposure').addEventListener('input',e=>renderer.setExposure(Number(e.target.value)/100));
  $('study-mode').addEventListener('click',()=>renderer.setExposure(.78));$('experiment-mode').addEventListener('click',()=>{pauseClock();renderer.setExposure(.12);activateView('screen');});
  $('zoom-in').addEventListener('click',()=>renderer.setZoom((renderer.goalZoom||1)*1.15));$('zoom-out').addEventListener('click',()=>renderer.setZoom((renderer.goalZoom||1)/1.15));$('auto-rotate').addEventListener('click',()=>renderer.toggleAuto());$('reset-view').addEventListener('click',()=>{resetRoom();scrollToStage();});
  $('detail-toggle').addEventListener('click',()=>{detail=detail==='micro'?'fine':'micro';renderer.setDetail(detail);$('detail-toggle').setAttribute('aria-pressed',String(detail==='fine'));$('detail-toggle').querySelector('b').textContent=detail==='micro'?'MICRO PIXELS':'FINE PIXELS';});
  $('save-image').addEventListener('click',()=>{try{renderer.saveView();toast('Saving your view of the chamber.');}catch{toast('This browser could not save the image.');}});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Use your browser’s fullscreen or landscape mode.');}catch{toast('Fullscreen is unavailable in this browser.');}});
  document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(walking&&['w','a','s','d'].includes(k)){e.preventDefault();step({w:'forward',a:'left',s:'back',d:'right'}[k]);}else if(e.key.startsWith('Arrow')){e.preventDefault();renderer.rotate(e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0,e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0);}else if(k==='r')resetRoom();else if(k==='l')$('sunlight-toggle').click();else if(k==='c')$('cutaway-toggle').click();});
  previews();
}catch(error){console.error(error);$('loading').innerHTML='<span>The chamber could not load. Please refresh to try again.</span>';toast('Unable to start the 3D room.');}
