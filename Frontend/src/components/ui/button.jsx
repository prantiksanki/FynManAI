import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#7c6af7] text-white hover:bg-[#a78bfa]",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-[#2a2a32] bg-transparent text-[#e2e2e8] hover:border-[#7c6af7] hover:bg-[rgba(124,106,247,0.08)]",
        secondary: "bg-[#17171a] text-[#e2e2e8] hover:bg-[#2a2a32]",
        ghost: "bg-transparent text-[#8888a0] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#e2e2e8]",
        link: "text-[#7c6af7] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
