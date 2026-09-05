
const views=[...document.querySelectorAll('.view')];
const navBtns=[...document.querySelectorAll('#nav button')];
const title=document.getElementById('pageTitle');
const sub=document.getElementById('pageSub');
const syncPill=document.getElementById('syncPill');
const mobileNet=document.getElementById('mobileNet');

let forcedOffline=localStorage.getItem('siceForcedOffline')==='1';
let serverReachable=navigator.onLine;
let pending=Number(localStorage.getItem('sicePending')||0);
let syncing=false;

const labels={
  dashboard:['Dashboard','Vista general de operación'],
  pedidos:['Pedidos','Diseños y especificaciones por pedido'],
  calidad:['Calidad','Inspecciones y liberación'],
  embarques:['Embarques','Carga, traslado y entrega'],
  campo:['SICE Campo','Experiencia móvil de operación']
};

function isOffline(){
  return forcedOffline || !navigator.onLine || !serverReachable;
}

function showView(id){
  views.forEach(v=>v.classList.toggle('active',v.id===id));
  navBtns.forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  title.textContent=labels[id][0];
  sub.textContent=labels[id][1];
  window.scrollTo({top:0,behavior:'smooth'});
}

navBtns.forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.jump)));

function updateSync(){
  const offline=isOffline();
  if(syncing){
    syncPill.className='sync pending';
    syncPill.textContent='● Sincronizando...';
    mobileNet.textContent='● Sync...';
  } else if(offline){
    syncPill.className='sync offline';
    syncPill.textContent='● Sin conexión';
    mobileNet.textContent='● Offline';
  } else if(pending>0){
    syncPill.className='sync pending';
    syncPill.textContent=`● ${pending} pendientes`;
    mobileNet.textContent='● Pendiente';
  } else {
    syncPill.className='sync online';
    syncPill.textContent='● Sincronizado';
    mobileNet.textContent='● Online';
  }

  localStorage.setItem('siceForcedOffline',forcedOffline?'1':'0');
  localStorage.setItem('sicePending',String(pending));

  const btn=document.getElementById('toggleOffline');
  if(btn){
    btn.textContent=forcedOffline?'Desactivar modo offline forzado':'Forzar modo sin conexión (demo)';
  }
}

function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),1800);
}

async function checkServer(){
  if(forcedOffline || !navigator.onLine){
    serverReachable=false;
    updateSync();
    return false;
  }
  try{
    const url=`./health.txt?ts=${Date.now()}`;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),3500);
    const r=await fetch(url,{cache:'no-store',signal:controller.signal});
    clearTimeout(timer);
    serverReachable=r.ok;
  }catch(e){
    serverReachable=false;
  }
  updateSync();
  if(serverReachable) syncIfPossible();
  return serverReachable;
}

function syncIfPossible(){
  if(syncing || isOffline() || pending<=0) return;
  syncing=true;
  const n=pending;
  updateSync();
  toast(`Sincronizando ${n} cambio${n===1?'':'s'}...`);
  setTimeout(()=>{
    pending=0;
    syncing=false;
    updateSync();
    toast('Todo sincronizado');
  },1100);
}

window.selectChoice=function(btn){
  btn.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));
  btn.classList.add('selected');
};

document.getElementById('saveInspection').addEventListener('click',()=>{
  if(isOffline()){
    pending++;
    document.getElementById('inspectionSync').textContent=
      'Inspección guardada localmente. Se sincronizará automáticamente al recuperar conexión.';
    updateSync();
    toast('Guardado localmente');
  }else{
    document.getElementById('inspectionSync').textContent='Inspección guardada y sincronizada.';
    toast('Inspección guardada');
  }
});

window.fieldEvent=function(msg){
  const log=document.getElementById('fieldLog');
  const now=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  log.innerHTML=`<b>Bitácora local</b><small>${now} · ${msg}</small>`;
  if(isOffline()){
    pending++;
    updateSync();
    toast('Guardado sin conexión');
  }else{
    toast(msg);
  }
};

document.getElementById('toggleOffline').addEventListener('click',()=>{
  forcedOffline=!forcedOffline;
  if(forcedOffline){
    serverReachable=false;
    updateSync();
    toast('Modo offline forzado');
  }else{
    toast('Comprobando conexión...');
    checkServer();
  }
});

document.getElementById('roleSelect').addEventListener('change',e=>{
  const role=e.target.value;
  if(role==='campo')showView('campo');
  else if(role==='calidad')showView('calidad');
  else if(role==='aserradero')showView('pedidos');
  else showView('dashboard');
  toast('Vista adaptada al rol seleccionado');
});

window.addEventListener('offline',()=>{
  serverReachable=false;
  updateSync();
  toast('Conexión perdida · trabajando offline');
});

window.addEventListener('online',()=>{
  toast('Red detectada · verificando servidor...');
  checkServer();
});

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible') checkServer();
});

updateSync();
checkServer();
setInterval(checkServer,15000);

if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
