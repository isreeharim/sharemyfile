import * as React from "react"
import { cn } from "../../lib/utils"

const Progress = React.forwardRef(({ className, value = 0, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-3 w-full overflow-hidden rounded-full bg-slate-800",
      className
    )}
    {...props}
  >
    <div
      className="h-full w-full flex-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 transition-all duration-300 rounded-full shadow-lg shadow-blue-500/50"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }
