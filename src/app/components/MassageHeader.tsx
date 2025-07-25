"use client"

import Link from "next/link"

export default function MassageHeader() {
  return (
    <div className="fixed top-0 left-0 w-full bg-white z-50 shadow-md">
      <Link href="/" passHref>
        <div className="p-4 cursor-pointer">
          <h1 className="text-sm font-yusei text-black">男がやるオイルマッサージ屋さん</h1>
          <h2 className="text-3xl mt-1 font-hepta text-black">Luca</h2>
        </div>
      </Link>
    </div>
  )
}
