"use client"

import { useState } from "react"

export interface TabDef {
  id: string
  label: string
  /** When true, render with reduced prominence (e.g. unfinished sections). */
  comingSoon?: boolean
}

interface TabsProps {
  tabs: TabDef[]
  defaultActive: string
  panels: Record<string, React.ReactNode>
}

export function Tabs({ tabs, defaultActive, panels }: TabsProps) {
  const [active, setActive] = useState(defaultActive)

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sections"
        className="flex flex-nowrap overflow-x-auto sm:flex-wrap sm:justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8 bg-bg-raised/40 border-y border-white/15 px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => {
          const isActive = t.id === active
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => setActive(t.id)}
              className={[
                "relative shrink-0 font-display tracking-[0.2em] uppercase text-[11px] sm:text-xs",
                "px-3 sm:px-4 py-2 rounded-xl transition",
                isActive
                  ? "bg-neon-cyan/15 text-neon-cyan ring-1 ring-neon-cyan/50 shadow-neon-cyan"
                  : "text-white/55 hover:text-white hover:bg-white/5",
                t.comingSoon && !isActive ? "opacity-70" : "",
              ].join(" ")}
            >
              {t.label}
              {t.comingSoon && (
                <span className="ml-1.5 inline-block size-1 align-middle rounded-full bg-white/30" />
              )}
            </button>
          )
        })}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          id={`tab-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
        >
          {panels[t.id]}
        </div>
      ))}
    </div>
  )
}
