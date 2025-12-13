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
      toastOptions={{
        className: `
          text-2xl font-semibold  
          px-8 py-5               
          w-auto                  
          max-w-none             
          whitespace-nowrap       
          rounded-2xl
          gap-4                   
        `,
      }}
      icons={{
        // [변경 6] 글자가 커진 만큼 아이콘도 size-7 ~ size-8 정도로 키워줍니다.
        success: <CircleCheckIcon className="size-7" />,
        info: <InfoIcon className="size-7" />,
        warning: <TriangleAlertIcon className="size-7" />,
        error: <OctagonXIcon className="size-7" />,
        loading: <Loader2Icon className="size-7 animate-spin" />,
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
