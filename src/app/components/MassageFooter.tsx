"use client";
import Link from "next/link"

import { useState } from "react";

export default function MassageFooter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 
                bg-white text-black text-3xl w-14 h-14 rounded-full shadow-md 
                hover:scale-110 transition-transform z-50 
                flex items-center justify-center leading-none"
            >
              ×
            </button>      


            <ul className="bg-white border border-gray-300 shadow-xl rounded-xl p-6 md:p-8 space-y-3 text-base md:text-lg lg:text-xl font-yusei text-gray-800 w-64 md:w-80 lg:w-96">
              <li><a href="/screen/home" className="block hover:underline">Home</a></li>
<li>
  <Link href="/screen/about" className="block hover:underline">
    Lucaのマッサージとは？
  </Link>
</li>          
<li>
<Link href="/screen/calender" className="block hover:underline">
空き情報/予約カレンダー

 </Link>
</li>   


              <li><a href="/screen/map" className="block hover:underline">Googleマップ/店舗情報</a></li>

              <li>
  <Link href="/screen/prices" className="block hover:underline">
    料金表
  </Link>
</li>  
              <li><a href="/screen/contact" className="block hover:underline">お問い合わせ</a></li>
              <li><a href="/tachibana" className="block hover:underline">アプリ断ち花</a></li>
            </ul>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50">
        <button onClick={() => setIsOpen(true)}>
          <img
            src="/image/shop.webp"
            alt="そよ風堂"
            className="w-24 sm:w-24 md:w-32 lg:w-40 drop-shadow-lg hover:scale-105 transition-transform"
          />
        </button>
      </div>
    </>
  );
}
