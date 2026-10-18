import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: "default" | "outline" | "ghost"; asChild?: boolean; }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "default", asChild, ...props }, ref) => {
  const Component = asChild ? Slot : "button";
  return <Component ref={ref} className={cn("inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium px-4 min-h-10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none", variant === "default" ? "bg-primary text-primary-foreground hover:bg-primary/90" : variant === "outline" ? "border border-border bg-background hover:bg-accent" : "hover:bg-accent", className)} {...props} />;
});
Button.displayName = "Button";
