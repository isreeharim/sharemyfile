import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue-600 text-white hover:bg-blue-500",
        secondary:
          "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700",
        destructive:
          "border-transparent bg-rose-600 text-white hover:bg-rose-500",
        outline:
          "text-slate-300 border-slate-700",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        info:
          "border-blue-500/30 bg-blue-500/10 text-blue-400",
        cyan:
          "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
