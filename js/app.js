/**
 * XR正道官衙遺跡 — メインアプリケーションロジック
 * 機能: タブ遷移 / テーマ切替 / Leaflet GPSマップ & ジオフェンス /
 *       model-viewer (.glb + .usdz AR) / Sketchfab遺物3D / 発掘Canvas / おまけAR（郡司と記念撮影）
 */
(function () {
  const CFG = window.XR_CONFIG;
  const STORAGE_KEY = "xr_shodo_kanga_state_v1";

  const state = loadState();
  let map = null;
  let userMarker = null;
  let userCoords = null;
  let watchId = null;
  let restorationOverlay = null;
  let excavationOverlay = null;
  let tileOSM = null;
  let tileSat = null;
  let mapLayers = { restoration: true, excavation: true, satellite: false };
  let pinMarkers = {};
  let currentModelTab = "buildings";
  let quoteIndex = 0;
  let helpIndex = 0;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      theme: "indigo",
      demoMode: true, // 動作確認しやすいよう初期ON（本番公開時は false に変更可能）
      sound: true,
      visitedBuildings: [],
      dugSpots: []
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
    updateProgressUI();
  }

  // Haversine 距離計算（メートル）
  function distanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // 1. 画面遷移
  function showView(viewId) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add("is-active");

    // ボトムナビ同期
    const tabMap = { home: "home", map: "map", models: "models", menu: "menu", about: "home", omake: "home" };
    const activeTab = tabMap[viewId] || "home";
    document.querySelectorAll(".nav-tab").forEach((btn) => {
      const tab = btn.dataset.tab;
      const isAct = tab === activeTab;
      btn.classList.toggle("is-active", isAct);
      const img = btn.querySelector("img");
      if (img) img.src = `./assets/images/nav/tab_${tab}_${isAct ? "on" : "off"}.png`;
    });

    if (viewId === "map") {
      initMapIfNeeded();
      setTimeout(() => map && map.invalidateSize(), 120);
    }
    if (viewId === "omake") {
      renderOmakeView();
    }
  }

  // 2. テーマ適用
  function applyTheme(themeId) {
    const theme = CFG.themes.find((t) => t.id === themeId) || CFG.themes[0];
    state.theme = theme.id;
    const homeEl = document.getElementById("view-home");
    if (homeEl) homeEl.style.backgroundImage = `url("${theme.bg}")`;
    document.querySelectorAll(".theme-swatch-btn").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.theme === theme.id);
    });
    saveState();
  }

  // 3. 進捗UI更新
  function updateProgressUI() {
    const count = state.visitedBuildings.length;
    const total = CFG.buildings.length;
    const el = document.getElementById("home-progress-text");
    if (el) {
      el.textContent = count >= total ? `${count} / ${total} 棟（おまけ解放済み！）` : `${count} / ${total} 棟 体験済み`;
    }
    const demoStatus = document.getElementById("map-gps-status");
    if (demoStatus && state.demoMode) {
      demoStatus.textContent = "デモモード中（どこでも体験OK）";
    }
    renderModelGrid();
    refreshMapPinIcons();
  }

  // 4. 3Dモデル鑑賞画面（建物5棟 / 遺物3点）
  function renderModelGrid() {
    const grid = document.getElementById("model-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (currentModelTab === "buildings") {
      CFG.buildings.forEach((b) => {
        const visited = state.visitedBuildings.includes(b.id);
        const card = document.createElement("button");
        card.className = "model-card";
        card.innerHTML = `
          <img class="model-card-thumb" src="${b.thumb}" alt="${b.name}">
          <div class="model-card-body">
            <p class="model-card-title serif">${b.name}（${b.kana}）</p>
            <p class="model-card-sub">${b.role}</p>
            ${visited ? '<span class="badge-done">体験済み</span>' : ""}
          </div>
        `;
        card.addEventListener("click", () => openBuildingViewer(b));
        grid.appendChild(card);
      });
    } else {
      CFG.artifacts.forEach((a) => {
        const card = document.createElement("button");
        card.className = "model-card";
        card.innerHTML = `
          <img class="model-card-thumb" src="${a.thumb}" alt="${a.name}">
          <div class="model-card-body">
            <p class="model-card-title serif">${a.name}</p>
            <p class="model-card-sub">${a.subtitle}</p>
          </div>
        `;
        card.addEventListener("click", () => openArtifactViewer(a));
        grid.appendChild(card);
      });
    }
  }

  function markBuildingVisited(id) {
    if (!state.visitedBuildings.includes(id)) {
      state.visitedBuildings.push(id);
      saveState();
    }
  }

  // 建物3D & Web AR (<model-viewer> .glb + .usdz)
  function openBuildingViewer(b) {
    markBuildingVisited(b.id);
    const modal = document.getElementById("modal-viewer");
    document.getElementById("viewer-title").textContent = `${b.name}（${b.kana}）`;
    const body = document.getElementById("viewer-body");
    body.innerHTML = `
      <model-viewer
        src="${b.glb}"
        ios-src="${b.usdz}"
        poster="${b.thumb}"
        alt="${b.name} 復元3Dモデル"
        ar
        ar-modes="webxr scene-viewer quick-look"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        exposure="1.05"
      >
        <button slot="ar-button" class="ar-launch-btn">
          <img src="./assets/images/icons/icon_ar.png" alt="">
          <span>ARで見る</span>
        </button>
      </model-viewer>
      <p style="font-size:11px;color:#5a5e6b;margin:8px 0 10px;">
        ドラッグで回転・ピンチで拡大縮小できます。対応スマホでは右下の「ARで見る」から実寸配置（Android: GLB / iOS: USDZ）を起動できます。
      </p>
      <div class="info-card" style="margin-bottom:0;">
        <h3 class="serif">${b.name} — ${b.role}</h3>
        <p>${b.description}</p>
      </div>
    `;
    modal.classList.add("is-open");
  }

  // 遺物3D（Sketchfab Embed API）
  function openArtifactViewer(a) {
    const modal = document.getElementById("modal-viewer");
    document.getElementById("viewer-title").textContent = a.name;
    const body = document.getElementById("viewer-body");
    body.innerHTML = `
      <div class="sketchfab-box">
        <iframe
          title="${a.name}（正道官衙遺跡）"
          frameborder="0"
          allowfullscreen
          mozallowfullscreen="true"
          webkitallowfullscreen="true"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          xr-spatial-tracking
          execution-while-out-of-viewport
          execution-while-not-rendered
          web-share
          src="https://sketchfab.com/models/${a.sketchfabUid}/embed"
        ></iframe>
      </div>
      <p class="sketchfab-credit">
        <a href="${a.modelUrl}" target="_blank" rel="noopener noreferrer">${a.name}（正道官衙遺跡）</a>
        by <a href="${a.authorUrl}" target="_blank" rel="noopener noreferrer">${a.authorName}</a> on Sketchfab
      </p>
      <div class="info-card" style="margin-bottom:0;">
        <p>${a.description}</p>
      </div>
    `;
    modal.classList.add("is-open");
  }

  // 5. マップ画面（Leaflet + GPS + レイヤー切替）
  function createPinIcon(imgPath) {
    return L.icon({
      iconUrl: imgPath,
      iconSize: [42, 49],
      iconAnchor: [21, 48]
    });
  }

  function initMapIfNeeded() {
    if (map) return;
    map = L.map("leaflet-map", {
      zoomControl: false,
      attributionControl: true
    }).setView([CFG.siteCenter.lat, CFG.siteCenter.lng], CFG.siteCenter.zoom);

    tileOSM = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    // 国土地理院 航空写真タイル（無料・APIキー不要・GitHub Pages対応）
    tileSat = L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", {
      maxZoom: 18,
      attribution: "国土地理院"
    });

    restorationOverlay = L.imageOverlay(
      "./assets/images/map/overlay_restoration.png",
      CFG.overlayBounds.restoration,
      { opacity: 0.85 }
    ).addTo(map);

    excavationOverlay = L.imageOverlay(
      "./assets/images/map/overlay_excavation.png",
      CFG.overlayBounds.excavation,
      { opacity: 0.8 }
    ).addTo(map);

    // 建物ピン5棟
    CFG.buildings.forEach((b) => {
      const done = state.visitedBuildings.includes(b.id);
      const marker = L.marker([b.lat, b.lng], {
        icon: createPinIcon(done ? "./assets/images/map/pin_building_done.png" : "./assets/images/map/pin_building.png")
      }).addTo(map);
      marker.on("click", () => openSpotSheet("building", b));
      pinMarkers[b.id] = marker;
    });

    // 発掘・解説ピン
    CFG.extraSpots.forEach((s) => {
      const iconPath = s.type === "dig" ? "./assets/images/map/pin_dig.png" : "./assets/images/map/pin_info.png";
      const marker = L.marker([s.lat, s.lng], { icon: createPinIcon(iconPath) }).addTo(map);
      marker.on("click", () => openSpotSheet(s.type, s));
    });

    map.on("click", () => closeSpotSheet());
    startGpsWatch();
  }

  function refreshMapPinIcons() {
    if (!map) return;
    CFG.buildings.forEach((b) => {
      const m = pinMarkers[b.id];
      if (!m) return;
      const done = state.visitedBuildings.includes(b.id);
      m.setIcon(createPinIcon(done ? "./assets/images/map/pin_building_done.png" : "./assets/images/map/pin_building.png"));
    });
  }

  function startGpsWatch() {
    const statusEl = document.getElementById("map-gps-status");
    if (!("geolocation" in navigator)) {
      statusEl.textContent = "この端末はGPS非対応です";
      return;
    }
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const dist = Math.round(distanceMeters(userCoords.lat, userCoords.lng, CFG.siteCenter.lat, CFG.siteCenter.lng));
        if (!state.demoMode) {
          statusEl.textContent = `GPS受信中（遺跡中心まで約${dist}m）`;
        }
        if (map) {
          if (!userMarker) {
            userMarker = L.marker([userCoords.lat, userCoords.lng], {
              icon: createPinIcon("./assets/images/map/pin_user.png")
            }).addTo(map);
          } else {
            userMarker.setLatLng([userCoords.lat, userCoords.lng]);
          }
        }
      },
      () => {
        if (!state.demoMode) {
          statusEl.textContent = "位置情報未許可（設定でデモモード可）";
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  function isWithinRange(lat, lng) {
    if (state.demoMode) return true;
    if (!userCoords) return false;
    return distanceMeters(userCoords.lat, userCoords.lng, lat, lng) <= CFG.geofenceRadiusMeters;
  }

  function openSpotSheet(type, data) {
    const sheet = document.getElementById("map-spot-sheet");
    document.getElementById("spot-sheet-title").textContent = data.name;
    let meta = "";
    if (userCoords) {
      const d = Math.round(distanceMeters(userCoords.lat, userCoords.lng, data.lat, data.lng));
      meta = `現在地から約 ${d}m`;
    } else {
      meta = state.demoMode ? "デモモード（遠隔体験OK）" : "GPS待機中";
    }
    document.getElementById("spot-sheet-meta").textContent = meta;
    document.getElementById("spot-sheet-desc").textContent = data.description;

    const actBtn = document.getElementById("spot-sheet-action");
    if (type === "building") {
      actBtn.textContent = "3D・ARで体験する";
      actBtn.onclick = () => {
        if (!isWithinRange(data.lat, data.lng)) {
          showAlert("現地限定コンテンツ", "この場所では体験できません。正道官衙遺跡の現地にて体験してください。（遠隔テスト時は「設定」からデモモードをONにできます）");
          return;
        }
        openBuildingViewer(data);
      };
    } else if (type === "dig") {
      actBtn.textContent = "発掘体験をはじめる";
      actBtn.onclick = () => {
        if (!isWithinRange(data.lat, data.lng)) {
          showAlert("現地限定コンテンツ", "この場所では体験できません。現地にて体験してください。（遠隔テスト時はデモモードをONにできます）");
          return;
        }
        openDigModal(data);
      };
    } else {
      actBtn.textContent = "詳しく読む";
      actBtn.onclick = () => showView("about");
    }
    sheet.classList.add("is-open");
  }

  function closeSpotSheet() {
    document.getElementById("map-spot-sheet").classList.remove("is-open");
  }

  // 6. 発掘ミニゲーム（Canvasスクラッチ）
  function openDigModal(spot) {
    const modal = document.getElementById("modal-dig");
    document.getElementById("dig-title").textContent = spot.name;
    document.getElementById("dig-result-msg").textContent = "指やマウスで土をこすって遺物を発掘しよう！";
    modal.classList.add("is-open");

    const canvas = document.getElementById("dig-canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 400;
    canvas.height = 400;
    ctx.globalCompositeOperation = "source-over";

    const soilImg = new Image();
    soilImg.onload = () => ctx.drawImage(soilImg, 0, 0, canvas.width, canvas.height);
    soilImg.src = "./assets/images/dig/dig_soil.png";

    let drawing = false;
    let strokes = 0;

    function scratch(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, Math.PI * 2);
      ctx.fill();
      strokes++;
      if (strokes > 28) {
        document.getElementById("dig-result-msg").textContent = `発掘成功！「${spot.artifactName}」が見つかりました！`;
        if (!state.dugSpots.includes(spot.id)) {
          state.dugSpots.push(spot.id);
          saveState();
        }
      }
    }

    canvas.onpointerdown = (e) => { drawing = true; scratch(e.clientX, e.clientY); };
    canvas.onpointermove = (e) => { if (drawing) scratch(e.clientX, e.clientY); };
    window.onpointerup = () => { drawing = false; };
  }

  // 7. おまけ画面（統一：建物5棟コンプリートで gunji.glb / gunji.usdz AR記念撮影解放）
  function renderOmakeView() {
    const container = document.getElementById("omake-stage");
    const unlocked = state.visitedBuildings.length >= CFG.buildings.length;
    const omake = CFG.omake;

    const checklistHtml = CFG.buildings
      .map((b) => {
        const done = state.visitedBuildings.includes(b.id);
        return `<span style="display:inline-block;margin:3px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;background:${done ? "#2e7a4a" : "#d8d3c8"};color:${done ? "#fff" : "#5a5e6b"};">${b.name}${done ? " ✓" : ""}</span>`;
      })
      .join("");

    if (unlocked) {
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/i.test(navigator.userAgent);

      container.innerHTML = `
        <div class="info-card" style="width:100%;text-align:center;">
          <h3 class="serif">${omake.title}</h3>
          <p style="font-size:12.5px;line-height:1.6;margin-bottom:14px;">${omake.description}</p>

          <!-- gunji.png タップでネイティブAR（iOS Quick Look / Android Scene Viewer）起動 -->
          <a id="omake-ar-trigger" rel="ar" href="${omake.usdz}" style="display:inline-block;text-decoration:none;cursor:pointer;">
            <img src="${omake.triggerImg}" alt="郡司をタップしてAR起動" style="height:280px;width:auto;display:block;margin:0 auto;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.22));">
          </a>
          <p style="margin:10px 0 4px;font-size:13px;font-weight:700;color:#22345e;">
            郡司をタップしてAR起動（記念撮影）
          </p>
        </div>
        <div style="text-align:center;">${checklistHtml}</div>
      `;

      const triggerEl = document.getElementById("omake-ar-trigger");
      triggerEl.addEventListener("click", (ev) => {
        if (isIOS && !omake.usdz.startsWith("data:")) {
          // iOS Safari は <a rel="ar" href="...usdz"> のネイティブ動作で Quick Look を直接起動
          return;
        }
        ev.preventDefault();
        if (isAndroid && !omake.glb.startsWith("data:")) {
          const absGlb = new URL(omake.glb, window.location.href).href;
          const intentUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(absGlb)}&mode=ar_preferred&title=${encodeURIComponent(omake.title)}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;end;`;
          window.location.href = intentUrl;
        } else {
          showAlert("ネイティブAR起動について", "iPhone（Safari）ではARクイックルック、Android（Chrome）ではScene Viewerが直接起動します。GitHub Pages公開URLからスマートフォンでお試しください。");
        }
      });
    } else {
      const remain = CFG.buildings.length - state.visitedBuildings.length;
      container.innerHTML = `
        <img class="reward-card-img" style="width:86%;max-width:320px;" src="${omake.lockedImg}" alt="おまけ解放前">
        <div class="info-card" style="width:100%;">
          <h3 class="serif">${omake.title}</h3>
          <p>復元建物5棟をすべて鑑賞すると、久世郡司の3Dモデル（<code>gunji.glb</code> / <code>gunji.usdz</code>）をARで呼び出して一緒に記念撮影ができるようになります。</p>
          <p style="font-weight:700;color:#9f3328;">あと ${remain} 棟の鑑賞で解放！</p>
          <div style="margin-top:8px;">${checklistHtml}</div>
        </div>
        <button class="primary-btn" style="width:100%;" id="btn-omake-to-models">3Dモデル鑑賞で建物を見る</button>
      `;
      document.getElementById("btn-omake-to-models").addEventListener("click", () => showView("models"));
    }
  }

  // 8. ヘルプモーダル
  function renderHelpSlide() {
    const slide = CFG.helpSlides[helpIndex];
    document.getElementById("help-slide-img").src = slide.img;
    document.getElementById("help-slide-title").textContent = slide.title;
    document.getElementById("help-slide-text").textContent = slide.text;
    const dots = document.getElementById("help-dots");
    dots.innerHTML = CFG.helpSlides
      .map((_, i) => `<span class="help-dot ${i === helpIndex ? "is-active" : ""}"></span>`)
      .join("");
  }

  // 汎用アラートモーダル
  function showAlert(title, message) {
    document.getElementById("alert-title").textContent = title;
    document.getElementById("alert-message").textContent = message;
    document.getElementById("modal-alert").classList.add("is-open");
  }

  // 初期化・イベントバインド
  function init() {
    setTimeout(() => {
      document.getElementById("splash-screen").classList.add("is-hidden");
    }, 1100);

    // テーマスウォッチ生成
    const swWrap = document.getElementById("theme-swatches");
    CFG.themes.forEach((t) => {
      const btn = document.createElement("button");
      btn.className = "theme-swatch-btn";
      btn.dataset.theme = t.id;
      btn.innerHTML = `<span class="theme-swatch-dot" style="background:${t.color};"></span><span>${t.label}</span>`;
      btn.addEventListener("click", () => applyTheme(t.id));
      swWrap.appendChild(btn);
    });
    applyTheme(state.theme);

    // 郡司セリフ切替
    const nextQuote = () => {
      quoteIndex = (quoteIndex + 1) % CFG.gunjiQuotes.length;
      document.getElementById("home-speech-text").textContent = CFG.gunjiQuotes[quoteIndex];
    };
    document.getElementById("home-speech-text").textContent = CFG.gunjiQuotes[0];
    document.getElementById("home-hero-char").addEventListener("click", nextQuote);
    document.getElementById("home-speech-wrap").addEventListener("click", nextQuote);

    // ナビゲーション＆バナーボタン
    document.querySelectorAll("[data-goto]").forEach((el) => {
      el.addEventListener("click", () => showView(el.dataset.goto));
    });

    // 3Dモデル鑑賞タブ切替
    document.querySelectorAll(".segment-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentModelTab = btn.dataset.modelTab;
        document.querySelectorAll(".segment-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
        renderModelGrid();
      });
    });

    // マップレイヤー切替
    document.getElementById("btn-layer-cg").addEventListener("click", (e) => {
      mapLayers.restoration = !mapLayers.restoration;
      e.currentTarget.classList.toggle("is-on", mapLayers.restoration);
      if (restorationOverlay) {
        mapLayers.restoration ? restorationOverlay.addTo(map) : map.removeLayer(restorationOverlay);
      }
    });
    document.getElementById("btn-layer-dig").addEventListener("click", (e) => {
      mapLayers.excavation = !mapLayers.excavation;
      e.currentTarget.classList.toggle("is-on", mapLayers.excavation);
      if (excavationOverlay) {
        mapLayers.excavation ? excavationOverlay.addTo(map) : map.removeLayer(excavationOverlay);
      }
    });
    document.getElementById("btn-layer-sat").addEventListener("click", (e) => {
      mapLayers.satellite = !mapLayers.satellite;
      e.currentTarget.classList.toggle("is-on", mapLayers.satellite);
      if (map) {
        if (mapLayers.satellite) {
          map.removeLayer(tileOSM);
          tileSat.addTo(map);
        } else {
          map.removeLayer(tileSat);
          tileOSM.addTo(map);
        }
      }
    });
    document.getElementById("btn-map-gps").addEventListener("click", () => {
      if (!map) return;
      if (userCoords) {
        map.setView([userCoords.lat, userCoords.lng], 18);
      } else {
        map.setView([CFG.siteCenter.lat, CFG.siteCenter.lng], CFG.siteCenter.zoom);
      }
    });

    // ヘルプモーダル
    document.querySelectorAll(".js-open-help").forEach((b) => {
      b.addEventListener("click", () => {
        helpIndex = 0;
        renderHelpSlide();
        document.getElementById("modal-help").classList.add("is-open");
      });
    });
    document.getElementById("btn-help-prev").addEventListener("click", () => {
      helpIndex = (helpIndex - 1 + CFG.helpSlides.length) % CFG.helpSlides.length;
      renderHelpSlide();
    });
    document.getElementById("btn-help-next").addEventListener("click", () => {
      helpIndex = (helpIndex + 1) % CFG.helpSlides.length;
      renderHelpSlide();
    });

    // モーダル閉じる
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.closeModal;
        document.getElementById(id).classList.remove("is-open");
        if (id === "modal-viewer") document.getElementById("viewer-body").innerHTML = "";
      });
    });

    // 設定画面スイッチ
    const demoToggle = document.getElementById("toggle-demo-mode");
    demoToggle.checked = state.demoMode;
    demoToggle.addEventListener("change", () => {
      state.demoMode = demoToggle.checked;
      saveState();
      const statusEl = document.getElementById("map-gps-status");
      if (statusEl) {
        statusEl.textContent = state.demoMode ? "デモモード中（どこでも体験OK）" : "GPS現地判定モード";
      }
    });

    document.getElementById("btn-reset-progress").addEventListener("click", () => {
      state.visitedBuildings = [];
      state.dugSpots = [];
      saveState();
      showAlert("初期化完了", "体験履歴と発掘データをリセットしました。");
    });

    updateProgressUI();
    showView("home");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
