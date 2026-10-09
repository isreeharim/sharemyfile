import * as React from "react"
import { cn } from "../../lib/utils"

const TabsContext = React.createContext({
  value: "",
  onValueChange: () => {},
})

const Tabs = ({ value, onValueChange, defaultValue, className, children, ...props }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const activeValue = value !== undefined ? value : internalValue
  const handleValueChange = onValueChange || setInternalValue

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-2xl bg-slate-900/80 border border-slate-800 p-1.5 text-slate-400 shadow-lg",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  const isSelected = context.value === value

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
        isSelected
          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
          : "text-slate-400 hover:text-white hover:bg-slate-800/40",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, value, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  if (context.value !== value) return null

  return (
    <div
      ref={ref}
      className={cn("mt-2 ring-offset-background focus-visible:outline-none animate-in fade-in-50 duration-200", className)}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
