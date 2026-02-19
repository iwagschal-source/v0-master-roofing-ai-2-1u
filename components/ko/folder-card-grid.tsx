"use client"

import { FolderCard, type FolderCardProps } from "./folder-card"
import type { CategoryKey } from "./folder-status-icon"

interface FolderCardGridProps {
  projects: FolderCardProps[]
  onFileClick?: (category: CategoryKey, fileName: string) => void
  onCardClick?: (projectName: string) => void
}

export function FolderCardGrid({ projects, onFileClick, onCardClick }: FolderCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {projects.map((project) => (
        <FolderCard
          key={project.projectName}
          projectName={project.projectName}
          clientName={project.clientName}
          folders={project.folders}
          activity={project.activity}
          onFileClick={onFileClick}
          onClick={() => onCardClick?.(project.projectName)}
        />
      ))}
    </div>
  )
}
