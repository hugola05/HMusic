const DB_NAME = "HMusicDB";
const STORE = "songs";
let db, songs = [], currentIndex = -1, shuffle = false, repeat = false, activeFilter = "all";
let objectUrl = null;

const audio = document.getElementById("audio");
const library = document.getElementById("library");
const empty = document.getElementById("empty");
const player = document.getElementById("player");
const search = document.getElementById("search");

const $ = id => document.getElementById(id);

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=e=>{
      const d=e.target.result;
      if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});
    };
    req.onsuccess=e=>{db=e.target.result;resolve(db)};
    req.onerror=()=>reject(req.error);
  });
}
function tx(mode="readonly"){
  return db.transaction(STORE,mode).objectStore(STORE);
}
function allSongs(){
  return new Promise((resolve,reject)=>{
    const r=tx().getAll();
    r.onsuccess=()=>resolve(r.result.sort((a,b)=>a.added-b.added));
    r.onerror=()=>reject(r.error);
  });
}
function addSong(song){
  return new Promise((resolve,reject)=>{
    const r=tx("readwrite").add(song);
    r.onsuccess=()=>{song.id=r.result;resolve(song)};
    r.onerror=()=>reject(r.error);
  });
}
function deleteSong(id){
  return new Promise((resolve,reject)=>{
    const r=tx("readwrite").delete(id);
    r.onsuccess=resolve;r.onerror=()=>reject(r.error);
  });
}
function updateSong(song){
  return new Promise((resolve,reject)=>{
    const r=tx("readwrite").put(song);
    r.onsuccess=resolve;r.onerror=()=>reject(r.error);
  });
}

function formatTime(s){
  if(!Number.isFinite(s)) return "0:00";
  s=Math.max(0,Math.floor(s));
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
}
function cleanName(name){
  return name.replace(/\.[^/.]+$/,"").replace(/[_-]+/g," ").trim() || "Musique";
}
function render(){
  const q=search.value.trim().toLowerCase();
  const filtered=songs.filter(s=>(activeFilter==="all" || s.favorite) && (s.title+" "+s.artist+" "+s.album).toLowerCase().includes(q));
  library.innerHTML="";
  empty.style.display=filtered.length?"none":"block";
  filtered.forEach(s=>{
    const row=document.createElement("div");
    row.className="song";
    row.innerHTML=`
      <div class="thumb">♫</div>
      <div class="songInfo"><div class="title">${esc(s.title)}</div><div class="artist">${esc(s.artist||"Artiste inconnu")}</div></div>
      <div class="songActions">
        <button title="Favori">${s.favorite?"♥":"♡"}</button>
        <button title="Lire">▶</button>
        <button title="Supprimer">⋯</button>
      </div>`;
    const buttons=row.querySelectorAll("button");
    buttons[0].onclick=async()=>{s.favorite=!s.favorite;await updateSong(s);render();};
    buttons[1].onclick=()=>playSong(s.id);
    buttons[2].onclick=async()=>{
      if(confirm(`Supprimer « ${s.title} » ?`)){
        await deleteSong(s.id);songs=await allSongs();
        if(s.id===songs[currentIndex]?.id) stopPlayer();
        render();
      }
    };
    library.appendChild(row);
  });
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

async function importFiles(files){
  for(const file of files){
    if(!file.type.startsWith("audio/") && !/\.(mp3|m4a|aac|wav|flac|aiff|aif|ogg|opus)$/i.test(file.name)) continue;
    const title=cleanName(file.name);
    await addSong({title,artist:"Artiste inconnu",album:"",file,added:Date.now(),favorite:false});
  }
  songs=await allSongs(); render();
}
function getSong(id){return songs.find(s=>s.id===id)}

async function playSong(id){
  const s=getSong(id); if(!s)return;
  currentIndex=songs.findIndex(x=>x.id===id);
  if(objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl=URL.createObjectURL(s.file);
  audio.src=objectUrl;
  audio.load();
  await audio.play();
  updatePlayer();
}
function stopPlayer(){audio.pause();audio.removeAttribute("src");player.classList.add("hidden");}
function updatePlayer(){
  const s=songs[currentIndex]; if(!s)return;
  player.classList.remove("hidden");
  $("nowTitle").textContent=s.title;
  $("nowArtist").textContent=s.artist||"Artiste inconnu";
  $("play").textContent=audio.paused?"▶":"❚❚";
  $("fav").textContent=s.favorite?"♥":"♡";
  $("fav").classList.toggle("active",!!s.favorite);
  $("repeat").classList.toggle("active",repeat);
}
async function next(){
  if(!songs.length)return;
  if(shuffle){
    currentIndex=Math.floor(Math.random()*songs.length);
  }else{
    currentIndex++;
    if(currentIndex>=songs.length){
      if(repeat)currentIndex=0; else {audio.pause();updatePlayer();return;}
    }
  }
  await playSong(songs[currentIndex].id);
}
async function previous(){
  if(audio.currentTime>3){audio.currentTime=0;return}
  currentIndex=(currentIndex-1+songs.length)%songs.length;
  await playSong(songs[currentIndex].id);
}

$("importBtn").onclick=()=> $("fileInput").click();
$("emptyImport").onclick=()=> $("fileInput").click();
$("fileInput").onchange=e=>{importFiles([...e.target.files]);e.target.value=""};
$("play").onclick=async()=>{if(!audio.src && songs.length){await playSong(songs[0].id)}else if(audio.paused){await audio.play()}else audio.pause();updatePlayer()};
$("next").onclick=next;
$("prev").onclick=previous;
$("repeat").onclick=()=>{repeat=!repeat;updatePlayer()};
$("fav").onclick=async()=>{const s=songs[currentIndex];if(!s)return;s.favorite=!s.favorite;await updateSong(s);updatePlayer();render()};
search.oninput=render;
audio.onplay=updatePlayer;
audio.onpause=updatePlayer;
audio.ontimeupdate=()=>{
  if(audio.duration){
    $("progress").value=(audio.currentTime/audio.duration)*100;
    $("currentTime").textContent=formatTime(audio.currentTime);
    $("duration").textContent=formatTime(audio.duration);
  }
};
$("progress").oninput=e=>{if(audio.duration)audio.currentTime=(e.target.value/100)*audio.duration};
audio.onended=next;

if("mediaSession" in navigator){
  navigator.mediaSession.setActionHandler("play",()=>audio.play());
  navigator.mediaSession.setActionHandler("pause",()=>audio.pause());
  navigator.mediaSession.setActionHandler("previoustrack",previous);
  navigator.mediaSession.setActionHandler("nexttrack",next);
}
audio.addEventListener("play",()=>{
  const s=songs[currentIndex]; if(!s||!("mediaSession" in navigator))return;
  navigator.mediaSession.metadata=new MediaMetadata({title:s.title,artist:s.artist||"Artiste inconnu",album:s.album||"HMusic"});
});

(async()=>{
  try{await openDB();songs=await allSongs();render();}
  catch(e){console.error(e);alert("Impossible d'ouvrir le stockage local.");}
})();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});

document.querySelectorAll(".tab").forEach(tab=>tab.onclick=()=>{
  activeFilter=tab.dataset.filter;
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));
  render();
});
document.getElementById("shuffle").onclick=()=>{
  shuffle=!shuffle;
  document.getElementById("shuffle").classList.toggle("active",shuffle);
};
