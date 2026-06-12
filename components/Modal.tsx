"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

interface ModalProps {
  children: React.ReactNode
}

export function Modal({ children }: ModalProps) {
  const router = useRouter()
  const overlayRef = useRef<HTMLDivElement>(null)

  function close() {
    router.back()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-2 sm:p-8"
      onClick={(e) => {
        if (e.target === overlayRef.current) close()
      }}
    >
      <div className="w-full max-w-3xl rounded-2xl bg-bg-raised ring-1 ring-white/10 shadow-2xl">
        <div className="flex justify-end p-3">
          <button
            type="button"
            onClick={close}
            className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="px-3 pb-5 sm:px-8 sm:pb-8">{children}</div>
      </div>
    </div>
  )
}
