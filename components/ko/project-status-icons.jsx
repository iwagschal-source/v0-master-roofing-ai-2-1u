'use client'

import { ICON_FILES } from '@/lib/brand-colors'

const ICONS = [
  { key: 'drawings',  src: ICON_FILES.drawingsIcon,  label: 'Drawings' },
  { key: 'bluebeam',  src: ICON_FILES.bluebeamIcon,  label: 'Bluebeam' },
  { key: 'takeoff',   src: ICON_FILES.takeoffIcon,   label: 'Takeoff' },
  { key: 'markup',    src: ICON_FILES.markupIcon,     label: 'Markup' },
  { key: 'export',    src: ICON_FILES.exportIcon,     label: 'Export' },
  { key: 'proposal',  src: ICON_FILES.proposalIcon,   label: 'Proposal' },
]

export default function ProjectStatusIcons({ iconStates = {}, onIconClick }) {
  return (
    <div className="flex items-center gap-2 py-3">
      {ICONS.map(({ key, src, label }) => {
        const active = !!iconStates[key]
        return (
          <button
            key={key}
            onClick={() => onIconClick?.(key)}
            disabled={!active}
            title={active ? label : `${label} (not available)`}
            className={`
              relative flex-shrink-0 transition-all duration-200
              ${active
                ? 'cursor-pointer hover:scale-105 hover:brightness-110'
                : 'cursor-default'
              }
            `}
          >
            {/* mix-blend-multiply eliminates the black PNG background on light pages */}
            <img
              src={src}
              alt={label}
              className={`
                h-9 w-auto mix-blend-multiply
                ${active ? '' : 'grayscale opacity-40'}
              `}
              draggable={false}
            />
          </button>
        )
      })}
    </div>
  )
}
