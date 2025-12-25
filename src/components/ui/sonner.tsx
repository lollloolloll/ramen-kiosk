"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      position="top-center"
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      visibleToasts={1}
      expand={false}
      toastOptions={{
        className: `
          text-3xl font-bold 
          px-8 py-5               
          whitespace-nowrap       
          rounded-2xl
          [&>div]:gap-8
             
          [&_[data-title]]:text-3xl             
          [&_[data-title]]:font-bold  
          [&_[data-description]]:text-2xl
          [&_[data-description]]:text-foreground
          [&_[data-description]]:font-medium
          [&_[data-description]]:mt-1
        `,
        style: {
          gap: "1rem",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-8" />,
        info: <InfoIcon className="size-8" />,
        warning: <TriangleAlertIcon className="size-8" />,
        error: <OctagonXIcon className="size-8" />,
        loading: <Loader2Icon className="size-8 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
