"use client"

import Image from "next/image"

/** @typedef {Object} VoiceToggleProps */

/** @param {any} props */
/** @param {any} props */
export function VoiceToggle({ isActive, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="transition-opacity hover:opacity-80"
      aria-label={isActive ? "Disable voice mode" : "Enable voice mode"}
      aria-pressed={isActive}
    >
      <Image
        src={isActive ? "/images/radio-1.png" : "/images/radio.png"}
        alt="Voice mode toggle"
        width={20}
        height={20}
        className="object-contain"
      />
    </button>
  )
}