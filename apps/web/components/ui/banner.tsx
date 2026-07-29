import * as React from "react"

import { cn } from "@/lib/utils"

function Banner({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner"
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        className
      )}
      {...props}
    />
  )
}

function BannerIcon({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner-icon"
      className={cn("mt-0.5 shrink-0", className)}
      {...props}
    />
  )
}

function BannerTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner-title"
      className={cn("font-bold", className)}
      {...props}
    />
  )
}

function BannerAction({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="banner-action"
      className={cn("mt-3 flex flex-wrap gap-2", className)}
      {...props}
    />
  )
}

function BannerClose({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="banner-close"
      className={cn(
        "-mr-1 -mt-1 ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current/20",
        className
      )}
      {...props}
    />
  )
}

export { Banner, BannerAction, BannerClose, BannerIcon, BannerTitle }
