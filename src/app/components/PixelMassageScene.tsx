// src/components/PixelMassageScene.tsx
// ------------------------------------------------------
// 役割：背景・吹き出し・HP・前景エフェクトを配列手順で再生
// 追加：persistentOverlays（全ステップ共通で常時表示）に対応
// ポイント：any不使用 / 文字列リテラル型で型崩れ防止
// ------------------------------------------------------

"use client";   // ★ これを最上部に追加

import React, { useEffect, useRef, useState } from "react"

/* ===== 型定義（外部からimportできるように export） ===== */
export type OverlayBase = {
  id: string
  x: number | string
  y: number | string
  w?: number | string
  h?: number | string
  z?: number
  show?: boolean
}

export type ImageOverlay = OverlayBase & {
  kind: "image"
  src: string
  alt?: string
  fit?: "contain" | "cover"
  pointerPass?: boolean
  style?: React.CSSProperties   // ★ 追加
}


// src/components/PixelMassageScene.tsx
export type BubbleOverlay = OverlayBase & {
  kind: "bubble"
  text: string
  align?: "left" | "right"
  flipX?: boolean
  style?: React.CSSProperties
  tailAt?: "top" | "bottom" | "left" | "right" // ★ 追加：しっぽの向き（中心寄せ）
}

export type Step = {
  durationMs: number
  bg?: string
  hp?: number
  overlays?: (ImageOverlay | BubbleOverlay)[]
}

type Props = {
  steps: Step[]
  width?: number
  aspectRatio?: string
  loop?: boolean
  onFinish?: () => void
  debug?: boolean
    onStep?: (index: number) => void;   // ← これを追加

  persistentOverlays?: (ImageOverlay | BubbleOverlay)[]
  fill?: boolean             // ← 追加
}

export default function PixelMassageScene({
  steps,
  width,
  aspectRatio = "1/1",
  loop = false,
  onFinish,
    onStep,        // ← ここにあること

  debug = false,
  persistentOverlays = [],
  fill = false,              // ← 追加（既定は従来どおり）
}: Props) {
  const [idx, setIdx] = useState<number>(0)
  const [hp, setHp] = useState<number>(steps[0]?.hp ?? 100)
  const timerRef = useRef<number | null>(null)

  // 画像プリロード（背景＋各オーバーレイ）
  useEffect(() => {
    const urls: string[] = []
    steps.forEach(s => {
      if (s.bg) urls.push(s.bg)
      s.overlays?.forEach(o => { if (o.kind === "image") urls.push(o.src) })
    })
    persistentOverlays.forEach(o => { if (o.kind === "image") urls.push(o.src) })
    Array.from(new Set(urls)).forEach(src => { const img = new Image(); img.src = src })
  }, [steps, persistentOverlays])

  // ステップ進行
  useEffect(() => {
    const s = steps[idx]
    if (!s) return
      onStep?.(idx);      // ★ これが絶対に必要！！

    if (typeof s.hp === "number") setHp(Math.max(0, Math.min(100, s.hp)))

    timerRef.current = window.setTimeout(() => {
      const next = idx + 1
      if (next < steps.length) {
        setIdx(next)
      } else if (loop) {
        setIdx(0)
      } else {
        onFinish?.()
      }
    }, s.durationMs)

    return () => { if (timerRef.current) window.clearTimeout(timerRef.current) }
  }, [idx, steps, loop, onFinish])

  const s = steps[idx]


  // 親ボックスのスタイル
  const bgImage =
    s?.bg
      ? (s.bg.startsWith("var(") || s.bg.startsWith("url(") ? s.bg : `url("${s.bg}")`)
      : undefined

  const sceneStyle: React.CSSProperties = {
    position: "relative",
    width: width ? `${width}px` : "100%",
    // ★ fill=true のときは高さ100%で全面フィット、aspect-ratioは使わない
    ...(fill ? { height: "100%" } : { aspectRatio }),
    overflow: "hidden",
    borderRadius: 12,
    backgroundImage: bgImage,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    ...(debug
      ? {
          backgroundImage: `${bgImage ? `${bgImage},` : ""}linear-gradient(#00000022 1px, transparent 1px), linear-gradient(90deg,#00000022 1px, transparent 1px)`,
          backgroundSize: `${bgImage ? "cover," : ""} 10% 10%, 10% 10%`,
          backgroundPosition: `${bgImage ? "center," : ""} 0 0, 0 0`,
        }
      : {}),
  }
  // クリックで%座標を拾えるデバッグ
  const onPick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!debug) return
    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const xPct = ((e.clientX - r.left) / r.width) * 100
    const yPct = ((e.clientY - r.top) / r.height) * 100
    console.log(`x:"${xPct.toFixed(1)}%", y:"${yPct.toFixed(1)}%"`)
  }

  // 描画対象（永続＋このステップ）
  const overlaysToRender = [
    ...persistentOverlays.filter(o => o.show !== false),
    ...(s?.overlays ?? []).filter(o => o.show !== false),
  ]

  return (
  <div style={sceneStyle} onClick={onPick}>
    {/* HPバー */}
   

    {/* オーバーレイ描画 */}
    {overlaysToRender.map(o => {
      const base: React.CSSProperties = {
        position: "absolute",
        left: typeof o.x === "number" ? `${o.x}px` : o.x,
        top: typeof o.y === "number" ? `${o.y}px` : o.y,
        width: o.w ? (typeof o.w === "number" ? `${o.w}px` : o.w) : undefined,
        height: o.h ? (typeof o.h === "number" ? `${o.h}px` : o.h) : undefined,
        zIndex: o.z ?? 500,
        userSelect: "none",
        outline: debug ? "1px dashed #00f8" : "none",
      }

      if (o.kind === "image") {
        return (
          <img
            key={o.id}
            src={o.src}
            alt={o.alt ?? ""}
            style={{
              ...base,
              objectFit: o.fit ?? "contain",
              pointerEvents: o.pointerPass ? "none" : "auto",
              ...(o.style ?? {}), // ここで style マージ（clipPath などもOK）
            }}
          />
        )
      }

    // 吹き出し
const padding = "10px 12px"
const bubbleStyle: React.CSSProperties = {
  ...base,
  maxWidth: "60%",
  background: "rgba(255,255,255,.95)",
  border: "2px solid #333",
  borderRadius: 10,
  padding,
  boxShadow: "0 2px 0 #333",
  fontWeight: 700,
  lineHeight: 1.25,
  transform: o.flipX ? "scaleX(-1)" : undefined,
  transformOrigin: "center",
  ...(o.style ?? {}),
}

const tailSize = 10
const tailCommon: React.CSSProperties = {
  content: '""', position: "absolute", width: 0, height: 0, borderStyle: "solid"
}

// ★ しっぽの方向（top/bottom/left/right）を中心寄せで描画
const side = o.tailAt ?? (o.align === "right" ? "right" : "left")

let tail: React.CSSProperties
let tailInner: React.CSSProperties

switch (side) {
  case "top":
    tail = {
      ...tailCommon,
      top: -tailSize, left: `calc(50% - ${tailSize}px)`,
      borderWidth: `0 ${tailSize}px ${tailSize}px ${tailSize}px`,
      borderColor: `transparent transparent #333 transparent`,
    }
    tailInner = {
      ...tailCommon,
      top: -tailSize + 2, left: `calc(50% - ${tailSize - 2}px)`,
      borderWidth: `0 ${tailSize - 2}px ${tailSize - 2}px ${tailSize - 2}px`,
      borderColor: `transparent transparent rgba(255,255,255,.95) transparent`,
    }
    break
  case "bottom":
    tail = {
      ...tailCommon,
      bottom: -tailSize, left: `calc(50% - ${tailSize}px)`,
      borderWidth: `${tailSize}px ${tailSize}px 0 ${tailSize}px`,
      borderColor: `#333 transparent transparent transparent`,
    }
    tailInner = {
      ...tailCommon,
      bottom: -tailSize + 2, left: `calc(50% - ${tailSize - 2}px)`,
      borderWidth: `${tailSize - 2}px ${tailSize - 2}px 0 ${tailSize - 2}px`,
      borderColor: `rgba(255,255,255,.95) transparent transparent transparent`,
    }
    break
  case "right":
    tail = {
      ...tailCommon,
      right: -tailSize, top: `calc(50% - ${tailSize}px)`,
      borderWidth: `${tailSize}px 0 ${tailSize}px ${tailSize}px`,
      borderColor: `transparent transparent transparent #333`,
    }
    tailInner = {
      ...tailCommon,
      right: -tailSize + 2, top: `calc(50% - ${tailSize - 2}px)`,
      borderWidth: `${tailSize - 2}px 0 ${tailSize - 2}px ${tailSize - 2}px`,
      borderColor: `transparent transparent transparent rgba(255,255,255,.95)`,
    }
    break
  case "left":
  default:
    tail = {
      ...tailCommon,
      left: -tailSize, top: `calc(50% - ${tailSize}px)`,
      borderWidth: `${tailSize}px ${tailSize}px ${tailSize}px 0`,
      borderColor: `transparent #333 transparent transparent`,
    }
    tailInner = {
      ...tailCommon,
      left: -tailSize + 2, top: `calc(50% - ${tailSize - 2}px)`,
      borderWidth: `${tailSize - 2}px ${tailSize - 2}px ${tailSize - 2}px 0`,
      borderColor: `transparent rgba(255,255,255,.95) transparent transparent`,
    }
    break
}

return (
  <div key={o.id} style={bubbleStyle}>
    <div style={tail} />
    <div style={tailInner} />
    <div style={{ transform: o.flipX ? "scaleX(-1)" : undefined }}>
      {o.text}
    </div>
  </div>
)

      })}
    </div>
  )
}
