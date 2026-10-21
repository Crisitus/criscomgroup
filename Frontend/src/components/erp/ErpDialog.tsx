"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import type { ReactNode } from "react"

/** Diálogo del rediseño (Radix en portal, clases `erp-dlg`). */
export function ErpDialog({ open, onOpenChange, title, description, icon, tone, children }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  icon?: ReactNode
  tone?: "bad"
  children: ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="erp-scrim" />
        <DialogPrimitive.Content className="erp-dlg" aria-describedby={undefined}>
          {icon && <div className={`dic${tone ? ` ${tone}` : ""}`}>{icon}</div>}
          <DialogPrimitive.Title asChild><h3>{title}</h3></DialogPrimitive.Title>
          {description && <p className="sub">{description}</p>}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Panel lateral (desktop) / pantalla completa (móvil). */
export function ErpDrawer({ open, onOpenChange, label, children }: { open: boolean; onOpenChange: (open: boolean) => void; label: string; children: ReactNode }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="erp-scrim" />
        <DialogPrimitive.Content className="erp-drawer" aria-describedby={undefined}>
          <DialogPrimitive.Title className="erp-sr">{label}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
