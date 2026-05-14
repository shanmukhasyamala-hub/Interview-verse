import { cn } from "../lib/utils";

export default function Button({
  className,
  variant = "primary",
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 disabled:opacity-50",
        variant === "primary" &&
          "bg-gradient-to-r from-neon-cyan/90 via-neon-violet/80 to-neon-pink/70 text-black hover:brightness-110",
        variant === "ghost" &&
          "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
        variant === "danger" && "bg-red-500/90 text-white hover:bg-red-500",
        className
      )}
      {...props}
    />
  );
}

