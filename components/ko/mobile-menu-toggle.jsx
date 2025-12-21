"use client"

/** @typedef {Object} MobileMenuToggleProps */

/** @param {any} props */
/** @param {any} props */
export function MobileMenuToggle({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
      aria-label="Toggle navigation menu"
    >
      <div className="flex flex-col items-center justify-center gap-[3px]">
        {/* Top dash - longer */}
        <div className="w-3.5 h-[2px] bg-primary rounded-full" />
        {/* Bottom dash - shorter */}
        <div className="w-2.5 h-[2px] bg-primary rounded-full" />
      </div>
    </button>
  )
}