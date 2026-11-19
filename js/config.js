/**
 * XR正道官衙遺跡 — アプリ設定・スポット・モデル・素材パス定義
 * 素材を差し替える場合は ./assets/ 以下の同名ファイルを上書きしてください。
 */
window.XR_CONFIG = {
  appName: "XR正道官衙遺跡",
  // 国指定史跡 正道官衙遺跡（庁屋・史跡公園中心: 北緯34度51分37.35秒 東経135度47分3.26秒）
  siteCenter: {
    lat: 34.860375,
    lng: 135.784239,
    zoom: 18
  },
  // 現地判定の許容半径（メートル）。屋外GPS誤差を考慮して 35m〜50m 推奨
  geofenceRadiusMeters: 45,
  // 復元図・発掘図オーバーレイの四隅座標 [南西, 北東]（正道官衙遺跡の史跡公園範囲）
  overlayBounds: {
    restoration: [
      [34.85998, 135.78388],
      [34.86075, 135.78460]
    ],
    excavation: [
      [34.86004, 135.78396],
      [34.86066, 135.78452]
    ]
  },
  // テーマカラー背景（設定画面で切替）
  themes: [
    { id: "indigo", label: "縹（藍）", color: "#22345e", bg: "./assets/images/bg/bg_home_indigo.png" },
    { id: "matcha", label: "常盤（緑）", color: "#2d523a", bg: "./assets/images/bg/bg_home_matcha.png" },
    { id: "vermilion", label: "朱（赤）", color: "#7f2b24", bg: "./assets/images/bg/bg_home_vermilion.png" },
    { id: "sumi", label: "墨（黒）", color: "#26282c", bg: "./assets/images/bg/bg_home_sumi.png" }
  ],
  // 郡司キャラクターのガイドセリフ（ホーム画面でタップ切替）
  gunjiQuotes: [
    "ようこそ正道官衙遺跡へ！わしは久世郡を治めた郡司じゃ。まずは『正道官衙遺跡とは』やマップを見てみよ。",
    "ここには奈良時代の役所『久世郡衙』の建物が整然と並んでおったのじゃ。",
    "5つの建物をすべて見ると『おまけ』でわしをタップしてAR記念撮影ができるようになるぞ！",
    "『3Dモデル鑑賞』では、自宅からでも建物5棟と出土遺物3点をじっくり眺められるぞ。"
  ],
  // おまけAR（建物5棟コンプリートで解放：正道官衙の郡司と記念撮影）
  omake: {
    title: "正道官衙の郡司と記念撮影",
    glb: "./assets/models/gunji.glb",
    usdz: "./assets/models/gunji.usdz",
    triggerImg: "./assets/images/character/gunji.png",
    lockedImg: "./assets/images/omake/omake_locked.png",
    description: "下の郡司キャラクター画像をタップすると、iPhoneはクイックルック、AndroidはScene ViewerなどのネイティブARが直接起動します。実空間に郡司を呼び出して記念撮影をお楽しみください！"
  },
  // 復元建物 3Dモデル（glb + iOS AR用 usdz 同梱前提）
  buildings: [
    {
      id: "choya",
      name: "庁屋",
      kana: "ちょうや",
      role: "郡衙の中心建物",
      glb: "./assets/models/choya.glb",
      usdz: "./assets/models/choya.usdz",
      thumb: "./assets/images/thumbs/choya_thum.png",
      lat: 34.86048,
      lng: 135.78423,
      description: "久世郡衙の中枢を担った最大の掘立柱建物です。庇（ひさし）を備え、政務や重要な儀式が執り行われました。"
    },
    {
      id: "nanmon",
      name: "南門",
      kana: "なんもん",
      role: "官衙区画の正門",
      glb: "./assets/models/nanmon.glb",
      usdz: "./assets/models/nanmon.usdz",
      thumb: "./assets/images/thumbs/nanmon_thum.png",
      lat: 34.86008,
      lng: 135.78423,
      description: "南辺の築地塀の中央に開かれた正門です。ここをくぐると正面に広大な前庭と庁屋がそびえていました。"
    },
    {
      id: "higashiya",
      name: "東屋",
      kana: "ひがしや",
      role: "前庭東側の実務棟",
      glb: "./assets/models/higashiya.glb",
      usdz: "./assets/models/higashiya.usdz",
      thumb: "./assets/images/thumbs/higashiya_thum.png",
      lat: 34.86030,
      lng: 135.78442,
      description: "庁屋の前庭東側に南北棟として配置された建物です。実務や事務作業、来訪者の控えなどに使われたと考えられます。"
    },
    {
      id: "mukaiya",
      name: "向屋",
      kana: "むかいや",
      role: "前庭西側の対称棟",
      glb: "./assets/models/mukaiya.glb",
      usdz: "./assets/models/mukaiya.usdz",
      thumb: "./assets/images/thumbs/mukaiya_thum.png",
      lat: 34.86030,
      lng: 135.78404,
      description: "東屋と向かい合うように配置された建物です。左右対称に近い計画的な官衙空間を形づくっていました。"
    },
    {
      id: "soeya",
      name: "副屋",
      kana: "そえや",
      role: "庁屋後方の付属棟",
      glb: "./assets/models/soeya.glb",
      usdz: "./assets/models/soeya.usdz",
      thumb: "./assets/images/thumbs/soeya_thum.png",
      lat: 34.86062,
      lng: 135.78423,
      description: "中心建物である庁屋の背後に建てられた付属施設です。庁屋の機能を補完する空間として利用されました。"
    }
  ],
  // 出土遺物 3Dモデル（Sketchfab Embed API）
  artifacts: [
    {
      id: "nokimarugawara",
      name: "複弁八葉蓮華文軒丸瓦",
      subtitle: "正道官衙遺跡 出土",
      thumb: "./assets/images/thumbs/ibutsu_nokimarugawara_thum.png",
      sketchfabUid: "356cc80d3dc348518d2b54e3513a0ff4",
      modelUrl: "https://sketchfab.com/3d-models/356cc80d3dc348518d2b54e3513a0ff4",
      authorName: "京都府城陽市 JOYO エコミュージアム",
      authorUrl: "https://sketchfab.com/joyo-ecomuseum",
      description: "奈良時代の屋根の軒先を飾った丸瓦です。八葉の複弁蓮華文が精緻に表現されています。"
    },
    {
      id: "nokihiragawara",
      name: "均整唐草文軒平瓦",
      subtitle: "正道官衙遺跡 出土",
      thumb: "./assets/images/thumbs/ibutsu_nokihiragawara_thum.png",
      sketchfabUid: "e0e5606fcc254c36afdda1e0b8f09913",
      modelUrl: "https://sketchfab.com/3d-models/e0e5606fcc254c36afdda1e0b8f09913",
      authorName: "京都府城陽市 JOYO エコミュージアム",
      authorUrl: "https://sketchfab.com/joyo-ecomuseum",
      description: "軒丸瓦と対になって軒先を葺いた平瓦です。左右対称の均整の取れた唐草文様が特徴です。"
    },
    {
      id: "enmenken",
      name: "円面硯",
      subtitle: "正道官衙遺跡 出土",
      thumb: "./assets/images/thumbs/ibutsu_enmenken_thum.png",
      sketchfabUid: "a570f128181c4870903feacd0f240c93",
      modelUrl: "https://sketchfab.com/3d-models/a570f128181c4870903feacd0f240c93",
      authorName: "京都府城陽市 JOYO エコミュージアム",
      authorUrl: "https://sketchfab.com/joyo-ecomuseum",
      description: "役人が木簡や文書に墨で文字を書くために使用した須恵器の硯です。ここが役所（官衙）であったことを示す重要な遺物です。"
    }
  ],
  // マップ上の発掘スポット・解説スポット
  extraSpots: [
    {
      id: "dig_01",
      type: "dig",
      name: "発掘体験：南門付近の瓦だまり",
      lat: 34.86016,
      lng: 135.78436,
      artifactName: "複弁八葉蓮華文軒丸瓦",
      description: "画面を指でこすって土の中から奈良時代の瓦を掘り出してみよう！"
    },
    {
      id: "info_01",
      type: "info",
      name: "発掘調査の歩み",
      lat: 34.86042,
      lng: 135.78408,
      description: "昭和48年（1973年）からの発掘調査により、整然と配置された大型掘立柱建物群が確認され、昭和49年（1974年）に国の史跡に指定されました。"
    }
  ],
  // ヘルプスライド（全4枚）
  helpSlides: [
    {
      img: "./assets/images/help/help_slide_01.png",
      title: "現地マップで遺跡を歩こう",
      text: "GPSで現在地を表示しながら、復元配置図や発掘調査図を現代の地図と重ねて見比べることができます。"
    },
    {
      img: "./assets/images/help/help_slide_02.png",
      title: "建物5棟を3D・ARで体験",
      text: "庁屋・南門・東屋・向屋・副屋の3Dモデルを自由に回転・拡大でき、対応スマホではARで実空間に配置できます。"
    },
    {
      img: "./assets/images/help/help_slide_03.png",
      title: "出土遺物3Dと発掘体験",
      text: "軒丸瓦・軒平瓦・円面硯の高精細3Dモデル鑑賞や、画面をこすって遺物を掘り出す発掘体験も楽しめます。"
    },
    {
      img: "./assets/images/help/help_slide_04.png",
      title: "全5棟を見ると『おまけAR』解放",
      text: "5棟すべての建物を鑑賞すると、『おまけ』で郡司画像をタップしてネイティブARで記念撮影ができます。"
    }
  ]
};
