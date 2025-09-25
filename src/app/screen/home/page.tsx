"use client";

import { useEffect, useState } from "react";
import MassageFooter from "../../components/MassageFooter";
import MassageHeader from "../../components/MassageHeader";
import PixelMassageScene, {
  type Step,
  type ImageOverlay,
  type BubbleOverlay,
} from "../../components/PixelMassageScene";
import HeartHPBar from "../../components/HeartHPBar";

// （ヘッダー高を --header-h に反映：リサイズにも追従）
function useHeaderHeightVar() {
  useEffect(() => {
    const header =
      (document.getElementById("app-header") as HTMLElement) ||
      (document.querySelector('[data-role="app-header"]') as HTMLElement) ||
      (document.querySelector("header") as HTMLElement) ||
      (document.querySelector("[class*='fixed'][class*='top-0'][class*='w-full']") as HTMLElement) ||
      null;
    const apply = () => {
      const h = header?.offsetHeight ?? 64;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    apply();
    const ro = header ? new ResizeObserver(apply) : null;
    if (ro && header) ro.observe(header);
    return () => ro?.disconnect();
  }, []);
}

// 吹き出しユーティリティ
const makeBubble = (
  o: Omit<BubbleOverlay, "kind" | "align"> & { align?: "left" | "right" }
): BubbleOverlay => ({ kind: "bubble", align: o.align ?? "left", ...o });

const persistentOverlays: ImageOverlay[] = [
  {
    id: "massageAnim",
    kind: "image",
    src: "/image/massage_anim.webp",
    x: "var(--anim-x, 0%)",
    y: "var(--anim-y, 125px)",
    w: "var(--anim-w, 100%)",
    h: "var(--anim-h, 100%)",
    z: 300,
    fit: "contain",
    pointerPass: true,
    style: { clipPath: "inset(var(--clip-inset, 0 50px 0 50px))" },
  },
];

const BG = "transparent"; // ← シーン自体は塗らず、下のbg-layerが見えるようにする
const sayTherapist = (id: string, text: string, dur = 1000): Step => ({
  durationMs: dur,
  bg: BG,
  overlays: [
    makeBubble({
      id,
      text,
      x: "calc(var(--therapist-x) + var(--dx, 0vmin))",
      y: "calc(var(--therapist-y) + var(--dy, 0vmin))",
      z: 600,
      align: "right",
      tailAt: "bottom",
    }),
  ],
});
const sayClient = (id: string, text: string, dur = 1000): Step => ({
  durationMs: dur,
  bg: BG,
  overlays: [
    makeBubble({
      id,
      text,
      x: "calc(var(--client-x) + var(--dx, 0vmin))",
      y: "calc(var(--client-y) + var(--dy, 0vmin))",
      z: 600,
      align: "left",
      tailAt: "top",
    }),
  ],
});
const gap = (ms: number): Step => ({ durationMs: ms, bg: BG, overlays: [] });

const steps: Step[] = [
  { ...sayTherapist("therapist-greet", "本日もよろしくお願いします", 1000), hp: 1 },
  gap(260),
  { ...sayClient("client-greet", "こちらこそ、お願いします", 1000), hp: 2 },
  gap(1060),
  { ...sayTherapist("therapist-check", "圧、強さはいかがですか？", 1200), hp: 3 },
  gap(260),
  { ...sayClient("client-reply", "ちょうど良いです。すごく楽です！", 1200), hp: 3 },
  gap(2020),
  {
    ...sayTherapist(
      "therapist-end",
      "五十肩ってね、正式には肩関節周囲炎って呼ばれていて、肩の関節包や腱板に炎症が起きてしまう病気なんです。特徴的なのは腕を横に上げる外転や外にひねる外旋の動きがガチッと制限されること。最初の炎症期は夜間痛が強く、横向きに寝るとズキズキして眠れない人も多いです。その後の拘縮期には痛みが少し落ち着きますが、関節包が線維化して固まるため外転や外旋がさらに動かなくなります。髪を後ろで結ぶ、エプロンのひもを結ぶなどの動作がとても難しくなるんですよ。回復期になると少しずつ可動域が戻ってきますが、自然に治るには半年から一年以上かかることもあります。治療としては炎症期には安静や消炎鎮痛薬、ステロイド注射で炎症を抑えるのが中心です。拘縮期には温熱療法やストレッチ、理学療法士による関節包のモビライゼーションが効果的。リハビリでは最初から無理に大きく動かすのではなく、痛みのない範囲で少しずつ外転や外旋を広げていくことが大切です。早めに専門医にかかって正しくリハビリを進めれば、後遺症を残さず改善できる可能性が高いですよ。",
      3000
    ),
    hp: 3,
  },
  { ...sayClient("client-reply", "急に何？", 1200), hp: 3 },
  gap(2020),
];

const stepsNeckStory: Step[] = [
  { ...sayClient("c-start", "そういえば最近寝違えがすごくて…首が痛いんだけど、なんでこんなことが起こるの？", 1600), hp: 1 },
  gap(260),
  { ...sayTherapist("t-ask", "んー、たけしさんは結構食べるほうですか？", 1000), hp: 1 },
  gap(260),
  { ...sayClient("c-reply1", "そうだね。こんなおいしい食べ物がいっぱいある国にいて食べないなんてほうがおかしいよ。", 1600), hp: 2 },
  gap(260),
  { ...sayTherapist("t-ask2", "なら夜とか結構食べちゃう？", 1000), hp: 2 },
  gap(260),
  { ...sayClient("c-reply2", "うん。付き合いもあるし。", 1000), hp: 2 },
  gap(260),
  { ...sayTherapist("t-hint", "それが原因かもですね。", 800), hp: 3 },
  gap(260),
  { ...sayClient("c-why", "へー、なんで？", 800), hp: 3 },
  gap(260),
  {
    ...sayTherapist(
      "t-explain1",
      "首の寝違えって、食べすぎや消化不良が原因で起こることもあるって知ってます？ 胃腸が疲れて横隔膜が硬くなると、首の筋肉も連動して緊張するんです。",
      2600
    ),
    hp: 4,
  },
  gap(200),
  {
    ...sayTherapist("t-explain2", "特に消化してない状態で寝ると、余計に寝違えが起こりやすいんですよ。", 2000),
    hp: 4,
  },
  gap(260),
  { ...sayClient("c-ask3", "なら寝る3時間前とかに済ませたほうがいいってこと？", 1400), hp: 4 },
  gap(260),
  { ...sayTherapist("t-yes", "まあそういうことです。", 800), hp: 4 },
  gap(260),
  { ...sayClient("c-end", "結局食べるものもだけど、食べ方も大事なんだなぁ…", 1400), hp: 4 },
    gap(1500),

    { ...sayClient("c-ask3", "…", 1400), hp: 4 },
  gap(260),

    { ...sayClient("c-ask3", "ここって三階だよね？", 1400), hp: 4 },
  gap(260),

   { ...sayTherapist("t-yes", "そうですね。", 800), hp: 4 },
  gap(260),

  { ...sayTherapist("t-yes", "どうしました？", 800), hp: 4 },
  gap(260),

    { ...sayClient("c-ask3", "いや別に…", 1400), hp: 4 },
  gap(1500),


];

const allSteps: Step[] = [
  ...steps,
  gap(400),
  { ...sayTherapist("sep-ellipsis", "…", 600), hp: 3 },
  gap(200),
  ...stepsNeckStory,
];

export default function HomePage() {
  useHeaderHeightVar();
  const [hp, setHp] = useState(0);

useEffect(() => {
  // ★ 再生キュー（秒）
  const bgList = [

    { src: "/image/通常30sec.webp",      duration: 30 },
    { src: "/image/怖い女3sec.webp",     duration: 3  },
    { src: "/image/通常30sec.webp",      duration: 30 },
    { src: "/image/怖い女6sec.webp",     duration: 6  },
        { src: "/image/通常30sec.webp",      duration: 15 },
    { src: "/image/ComfyUI_00020_.webp", duration: 6  },
  ];

  // ★ DOM取得（null安全）
  const a = document.getElementById("bgA") as HTMLDivElement | null;
  const b = document.getElementById("bgB") as HTMLDivElement | null;
  if (!a || !b) return; // 要素なければ何もしない

  // ★ 初期フレームを必ずセット（真っ黒防止）
  let i = 0;
  a.style.backgroundImage = `url("${bgList[0].src}")`; // ← 最初はA面に表示
  a.style.opacity = "1";
  b.style.opacity = "0";

  // ★ フェードの面制御
  let current: HTMLDivElement = a;
  let timer: number | null = null;

  const swap = () => {
    i = (i + 1) % bgList.length;
    const next = bgList[i];
    const other = current === a ? b : a;

    // 次のフレームをもう片方へ
    other.style.backgroundImage = `url("${next.src}")`;
    other.style.opacity = "1";   // フェードイン
    current.style.opacity = "0"; // フェードアウト
    current = other;

    timer = window.setTimeout(swap, next.duration * 1000); // 次切替
  };

  timer = window.setTimeout(swap, bgList[0].duration * 1000); // 最初の切替予約

  return () => { if (timer) window.clearTimeout(timer); }; // クリーンアップ
}, []);



  return (
    <div className="font-yusei overflow-hidden">
      <MassageHeader />

      <main
        style={{
          position: "relative",
          height: "100dvh",
          width: "100vw",
          overflow: "hidden",
        }}
      >
        <div className="hpbar-wrap">
          <HeartHPBar hp={hp} max={5} />
        </div>

<div className="bg-layer">
  <div className="bg-img" id="bgA"></div>  {/* ← bg-top 削除 */}
  <div className="bg-img" id="bgB"></div>  {/* ← bg-top 削除 */}
</div>

        <div className="scene-root">
          <PixelMassageScene
  key={allSteps.length}
  steps={allSteps}  // ← 変更：mapで bg を "var(--scene-bg)" にしない
  persistentOverlays={persistentOverlays}
  fill
  loop={true}
  debug={false}
  onStep={(i) => {
    const v = allSteps[i]?.hp;
    if (typeof v === "number") setHp(v);
  }}
  onFinish={() => setHp(0)}
/>
        </div>
      </main>

      <MassageFooter />
    </div>
  );
}
