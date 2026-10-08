"use strict";
// HMusic V5 — réorganisation par appui long et stockage local persistant.
const DB_NAME = "HMusicDB";
const STORE = "songs";
const AUDIO_STORE = "audioData";
const DB_VERSION = 2;
let db;
let songs = [];
let currentIndex = -1;
let shuffle = false, repeat = false, activeFilter = "all";
let objectUrl = null;
let importing = false;
let dragging = false;
const $ = id => document.getElementById(id);
const audio = $("audio"), library = $("library"), empty = $("empty"), player = $("player"), search = $("search");

function setStatus(message, type="info") {
  const el = $("importStatus");
  el.textContent = message;
  el.className = "importStatus " + type;
  el.hidden = false;
}
function formatError(err) {
  const name = err?.name || "";
  if (name === "QuotaExceededError") return "Espace de stockage insuffisant sur cet appareil.";
  if (name === "NotAllowedError" || name === "SecurityError") return "Stockage interdit : évite la navigation privée et autorise les données du site.";
  if (name === "AbortError") return "Enregistrement interrompu. Réessaie.";
  return err?.message || String(err) || "Erreur inconnue";
}
function requestResult(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error("Erreur de stockage"));
  });
}
function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error("IndexedDB non disponible")); return; }
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const database = r.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, {keyPath:"id", autoIncrement:true});
      if (!database.objectStoreNames.contains(AUDIO_STORE)) database.createObjectStore(AUDIO_STORE);
    };
    r.onsuccess = () => {
      db = r.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    r.onerror = () => reject(r.error || new Error("Impossible d’ouvrir la bibliothèque"));
    r.onblocked = () => setStatus("Ferme les autres onglets HMusic puis recharge la page.", "error");
  });
}
function allSongs() {
  return requestResult(db.transaction(STORE, "readonly").objectStore(STORE).getAll())
    .then(rows => rows.sort((a,b) => songOrder(a) - songOrder(b) || a.id - b.id));
}
function saveNewSong(meta, buffer) {
  // Une seule transaction : la piste et son contenu audio sont sauvegardés ensemble.
  return new Promise((resolve, reject) => {
    let tr;
    try { tr = db.transaction([STORE, AUDIO_STORE], "readwrite"); }
    catch(e) { reject(e); return; }
    const metaStore = tr.objectStore(STORE);
    const dataStore = tr.objectStore(AUDIO_STORE);
    const r = metaStore.add(meta);
    let assignedId;
    r.onsuccess = () => {
      assignedId = r.result;
      try { dataStore.put(buffer, assignedId); }
      catch(e) { try {tr.abort();} catch(_) {} }
    };
    tr.oncomplete = () => resolve(assignedId);
    tr.onerror = () => reject(tr.error || new Error("Échec de l’enregistrement"));
    tr.onabort = () => reject(tr.error || new Error("Enregistrement annulé"));
  });
}
function updateSong(song) {
  return new Promise((resolve, reject) => {
    const tr = db.transaction(STORE,"readwrite");
    tr.objectStore(STORE).put(song);
    tr.oncomplete = resolve;
    tr.onerror = () => reject(tr.error);
    tr.onabort = () => reject(tr.error || new Error("Transaction interrompue"));
  });
}
function removeSong(id) {
  return new Promise((resolve, reject) => {
    const tr = db.transaction([STORE,AUDIO_STORE], "readwrite");
    tr.objectStore(STORE).delete(id);
    tr.objectStore(AUDIO_STORE).delete(id);
    tr.oncomplete = resolve;
    tr.onerror = () => reject(tr.error);
    tr.onabort = () => reject(tr.error || new Error("Suppression interrompue"));
  });
}
function getAudioBuffer(id) {
  return requestResult(db.transaction(AUDIO_STORE,"readonly").objectStore(AUDIO_STORE).get(id));
}
function readFile(file) {
  // FileReader comme fallback pour les anciennes versions de Safari.
  if (file.arrayBuffer) return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
function songOrder(s) { return Number.isFinite(s.order) ? s.order : (s.added || 0); }
function cleanName(name) { return name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim() || "Musique"; }
function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  const secs = Math.max(0, Math.floor(value));
  return `${Math.floor(secs/60)}:${String(secs%60).padStart(2,"0")}`;
}
function esc(v) { return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function isAudio(file) { return /\.(mp3|m4a|aac|wav|flac|aiff|aif|ogg|opus|mp4)$/i.test(file.name) || file.type.startsWith("audio/"); }
function render() {
  const reorderEnabled = activeFilter === "all" && !search.value.trim();
  $("reorderHint").hidden = !reorderEnabled || !songs.length;
  const q = search.value.trim().toLowerCase();
  const filtered = songs.filter(s => (activeFilter === "all" || s.favorite) &&
    [s.title,s.artist,s.album].join(" ").toLowerCase().includes(q));
  library.innerHTML = "";
  empty.style.display = filtered.length ? "none" : "block";
  $("trackCount").textContent = `${songs.length} morceau${songs.length > 1 ? "x" : ""}`;
  for (const s of filtered) {
    const row = document.createElement("div");
    row.className = "song";
    row.dataset.songId = String(s.id);
    row.innerHTML = `<div class="thumb">♫</div><div class="songInfo"><div class="title">${esc(s.title)}</div><div class="artist">${esc(s.artist||"Artiste inconnu")}</div></div><div class="songActions"><button aria-label="Favori">${s.favorite?"♥":"♡"}</button><button aria-label="Lire">▶</button><button aria-label="Supprimer">⋯</button></div>${reorderEnabled?`<button class="dragHandle" type="button" aria-label="Déplacer ${esc(s.title)}. Maintiens appuyé puis fais glisser" title="Maintenir pour déplacer">☰</button>`:""}`;
    const btns = row.querySelectorAll("button");
    btns[0].onclick = async () => {
      try { s.favorite = !s.favorite; await updateSong(s); render(); updatePlayer(); }
      catch(e) { setStatus("Favori non enregistré : " + formatError(e),"error"); }
    };
    btns[1].onclick = () => playSong(s.id);
    btns[2].onclick = async () => {
      if (!confirm(`Supprimer « ${s.title} » ?`)) return;
      try {
        if (songs[currentIndex]?.id === s.id) stopPlayer();
        await removeSong(s.id);
        songs = await allSongs();
        currentIndex = -1;
        render();
      } catch(e) { setStatus("Suppression impossible : " + formatError(e),"error"); }
    };
    if (reorderEnabled) enableLongPressReorder(row);
    library.appendChild(row);
  }
}

// Enregistre l’ordre en une seule transaction pour conserver la bibliothèque intacte.
function saveSongOrder(orderedSongs) {
  return new Promise((resolve, reject) => {
    let tr;
    try { tr = db.transaction(STORE, "readwrite"); }
    catch(e) { reject(e); return; }
    const store = tr.objectStore(STORE);
    orderedSongs.forEach((song, i) => store.put({ ...song, order:i }));
    tr.oncomplete = () => resolve();
    tr.onerror = () => reject(tr.error || new Error("Ordre non enregistré"));
    tr.onabort = () => reject(tr.error || new Error("Ordre non enregistré"));
  });
}

async function applyReorder() {
  const ids = Array.from(library.querySelectorAll(".song"), el => Number(el.dataset.songId));
  if (ids.length !== songs.length) return;
  const before = songs.map(song => song.id);
  if (ids.every((id,i) => id === before[i])) return;
  const playingId = songs[currentIndex]?.id;
  const byId = new Map(songs.map(song=>[song.id, song]));
  const reordered = ids.map(id=>byId.get(id));
  if (reordered.some(song=>!song)) { render(); return; }
  try {
    await saveSongOrder(reordered);
    songs = reordered.map((song,i)=>({ ...song, order:i }));
    currentIndex = playingId === undefined ? -1 : songs.findIndex(song=>song.id === playingId);
    updatePlayer();
    render();
    setStatus("✓ Nouvel ordre des morceaux enregistré !", "success");
  } catch(e) {
    setStatus("Impossible de sauvegarder l’ordre : " + formatError(e), "error");
    try { songs = await allSongs(); } catch(_) {}
    currentIndex = playingId === undefined ? -1 : songs.findIndex(song=>song.id === playingId);
    render();
  }
}

// Pointer Events fonctionnent pour la souris et pour le toucher (iOS / Android).
// La poignée évite de bloquer le défilement tactile normal de la liste.
function enableLongPressReorder(row) {
  const handle = row.querySelector(".dragHandle");
  if (!handle) return;
  let startX=0, startY=0, pointerId=null, timer=null, active=false;
  const clearTimer=()=>{ if(timer !== null) { clearTimeout(timer); timer=null; } };
  function reset() {
    clearTimer();
    active=false;
    dragging=false;
    row.classList.remove("dragging");
    library.classList.remove("reordering");
    document.body.classList.remove("draggingSong");
    pointerId=null;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerCancel);
  }
  handle.addEventListener("pointerdown", event=>{
    if (dragging || importing || event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    startX=event.clientX; startY=event.clientY;
    pointerId=event.pointerId;
    document.addEventListener("pointermove", onPointerMove, {passive:false});
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
    try { handle.setPointerCapture(pointerId); } catch(_) {}
    timer=setTimeout(()=>{
      active=true; dragging=true;
      row.classList.add("dragging");
      library.classList.add("reordering");
      document.body.classList.add("draggingSong");
      if(navigator.vibrate) navigator.vibrate(15);
    }, 260);
  });
  function onPointerMove(event) {
    if(event.pointerId !== pointerId) return;
    if (!active) {
      if(Math.hypot(event.clientX-startX,event.clientY-startY)>12) clearTimer();
      return;
    }
    event.preventDefault();
    // Défilement quand le doigt s’approche d’un bord de l’écran.
    if (event.clientY < 85) window.scrollBy(0,-16);
    else if (event.clientY > window.innerHeight - 105) window.scrollBy(0,16);
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest(".song");
    if (!target || target===row || target.parentElement!==library) return;
    const box=target.getBoundingClientRect();
    library.insertBefore(row, event.clientY < box.top + box.height/2 ? target : target.nextSibling);
  }
  function onPointerUp(event) {
    if(event.pointerId !== pointerId) return;
    const moved=active;
    reset();
    if (moved) void applyReorder();
  }
  function onPointerCancel(event) {
    if(event.pointerId !== pointerId) return;
    const moved=active;
    reset();
    if(moved) render();
  }
  handle.addEventListener("contextmenu", event=>event.preventDefault());
  handle.addEventListener("click", event=>event.preventDefault());
}

async function importFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  if (importing) {setStatus("Une importation est déjà en cours."); return;}
  importing = true;
  $("importBtn").disabled = true;
  $("emptyImport").disabled = true;
  let ok=0, failed=0, unsupported=0;
  try {
    await ready;
    for (let i=0;i<files.length;i++) {
      const f = files[i];
      if (!isAudio(f)) { unsupported++; continue; }
      setStatus(`Importation ${i+1}/${files.length} : ${f.name}…`);
      try {
        if (!f.size) throw new Error("Le fichier est vide ou indisponible.");
        const bytes = await readFile(f);
        await saveNewSong({ title:cleanName(f.name), artist:"Artiste inconnu", album:"", type:f.type || inferMime(f.name), added:Date.now()+i, favorite:false, size:f.size, order:Math.max(0,...songs.map(songOrder))+1 }, bytes);
        ok++;
        // Chaque succès s’affiche immédiatement, sans attendre le lot complet.
        songs = await allSongs();
        activeFilter = "all";
        document.querySelectorAll(".tab").forEach(tab=>tab.classList.toggle("active",tab.dataset.filter==="all"));
        search.value = "";
        render();
      } catch(e) {
        failed++;
        console.error("HMusic import error", f.name, e);
        setStatus(`Impossible d’ajouter « ${f.name} » : ${formatError(e)}`,"error");
      }
    }
    if (ok) setStatus(`✓ ${ok} morceau${ok>1?"x":""} ajouté${ok>1?"s":""} !${failed||unsupported?` (${failed} erreur(s), ${unsupported} fichier(s) ignoré(s))`:""}`,"success");
    else if (!failed) setStatus("Aucun fichier audio reconnu. Essaie un MP3 téléchargé dans Fichiers.","error");
  } catch(e) {
    console.error("HMusic initialization", e);
    setStatus("Impossible d’accéder à la bibliothèque : " + formatError(e),"error");
  } finally {
    importing=false;
    $("importBtn").disabled=false;
    $("emptyImport").disabled=false;
  }
}
function inferMime(name) {
  const ext = name.split(".").pop().toLowerCase();
  return ({mp3:"audio/mpeg",m4a:"audio/mp4",aac:"audio/aac",wav:"audio/wav",flac:"audio/flac",ogg:"audio/ogg",opus:"audio/ogg",aiff:"audio/aiff",aif:"audio/aiff",mp4:"audio/mp4"})[ext] || "audio/mpeg";
}
async function playSong(id) {
  const index = songs.findIndex(s=>s.id===id);
  if (index<0) return;
  const s=songs[index];
  try {
    await ready;
    let blob;
    if (s.file instanceof Blob) blob = s.file; // Compatibilité avec la v3.
    else {
      const bytes = await getAudioBuffer(id);
      if (!bytes) throw new Error("Fichier audio introuvable dans le stockage local");
      blob = new Blob([bytes], {type:s.type || "audio/mpeg"});
    }
    audio.pause();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl=URL.createObjectURL(blob);
    currentIndex=index;
    audio.src=objectUrl;
    audio.load();
    updatePlayer();
    await audio.play();
  } catch(e) {
    console.error("HMusic playback",e);
    setStatus("Lecture impossible : " + formatError(e),"error");
  }
}
function stopPlayer() {
  audio.pause(); audio.removeAttribute("src"); audio.load();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl=null; currentIndex=-1;
  player.classList.add("hidden");
}
function updatePlayer() {
  const s=songs[currentIndex]; if (!s) return;
  player.classList.remove("hidden");
  $("nowTitle").textContent=s.title;
  $("nowArtist").textContent=s.artist || "Artiste inconnu";
  $("play").textContent=audio.paused?"▶":"❚❚";
  $("fav").textContent=s.favorite?"♥":"♡";
  $("fav").classList.toggle("active",!!s.favorite);
  $("repeat").classList.toggle("active",repeat);
}
async function next() {
  if (!songs.length) return;
  let i=currentIndex;
  if (shuffle) i=songs.length===1?0:Math.floor(Math.random()*songs.length);
  else i++;
  if (i>=songs.length) {
    if (repeat) i=0;
    else {audio.pause();updatePlayer();return;}
  }
  await playSong(songs[i].id);
}
async function previous() {
  if (!songs.length) return;
  if (audio.currentTime>3) { audio.currentTime=0; return; }
  const i=(currentIndex-1+songs.length)%songs.length;
  await playSong(songs[i].id);
}
function wire() {
  $("importBtn").onclick=()=>$("fileInput").click();
  $("emptyImport").onclick=()=>$("fileInput").click();
  $("fileInput").addEventListener("change", e=>{
    const files=Array.from(e.target.files || []);
    // Réinitialiser avant await pour permettre la réimportation du même MP3.
    e.target.value="";
    void importFiles(files);
  });
  $("play").onclick=async()=>{
    if (currentIndex<0) { if(songs.length) await playSong(songs[0].id); }
    else if(audio.paused) {try{await audio.play();}catch(e){setStatus("Lecture impossible : "+formatError(e),"error");}}
    else audio.pause();
    updatePlayer();
  };
  $("next").onclick=next;
  $("prev").onclick=previous;
  $("repeat").onclick=()=>{repeat=!repeat;updatePlayer();};
  $("shuffle").onclick=()=>{shuffle=!shuffle;$("shuffle").classList.toggle("active",shuffle);};
  $("fav").onclick=async()=>{
    const s=songs[currentIndex];if(!s)return;
    try{s.favorite=!s.favorite;await updateSong(s);updatePlayer();render();}
    catch(e){setStatus("Favori non enregistré : "+formatError(e),"error");}
  };
  search.oninput=render;
  document.querySelectorAll(".tab").forEach(tab=>tab.onclick=()=>{
    activeFilter=tab.dataset.filter;
    document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));
    render();
  });
  audio.onplay=updatePlayer;
  audio.onpause=updatePlayer;
  audio.ontimeupdate=()=>{
    if (audio.duration) {
      $("progress").value=100*audio.currentTime/audio.duration;
      $("currentTime").textContent=formatTime(audio.currentTime);
      $("duration").textContent=formatTime(audio.duration);
    }
  };
  audio.onloadedmetadata=()=>{ $("duration").textContent=formatTime(audio.duration); };
  $("progress").oninput=e=>{if(audio.duration)audio.currentTime=(e.target.value/100)*audio.duration;};
  audio.onended=next;
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play",()=>audio.play());
      navigator.mediaSession.setActionHandler("pause",()=>audio.pause());
      navigator.mediaSession.setActionHandler("previoustrack",previous);
      navigator.mediaSession.setActionHandler("nexttrack",next);
      audio.addEventListener("play",()=>{
        const s=songs[currentIndex];if(!s || typeof MediaMetadata==="undefined")return;
        navigator.mediaSession.metadata=new MediaMetadata({title:s.title,artist:s.artist||"Artiste inconnu",album:s.album||"HMusic"});
      });
    } catch(e) { console.warn("MediaSession non disponible",e); }
  }
}
wire();
const ready=(async()=>{
  try {await openDB();songs=await allSongs();render();}
  catch(e) {console.error("HMusic database error",e);setStatus("Stockage indisponible : "+formatError(e),"error");throw e;}
})();
if ("serviceWorker" in navigator) {
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js?v=5", {updateViaCache:"none"}).catch(e=>console.warn("HMusic offline",e)));
}
