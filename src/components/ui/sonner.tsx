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
      offset={40}
      toastOptions={{
        className: `
          group toast
          font-sans
          bg-white/95 dark:bg-slate-900/95 backdrop-blur-md 
          border border-slate-200/60 dark:border-slate-700/60
          shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8_30px_rgb(0,0,0,0.4)]
          rounded-3xl
          px-6 py-5
          !flex !items-center
        `,
        classNames: {
          toast: "w-auto min-w-[380px] max-w-[90vw]",
          title:
            "text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight",
          description:
            "text-lg font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug",
          actionButton:
            "bg-slate-900 text-white font-bold rounded-xl px-4 py-2",
          cancelButton:
            "bg-slate-100 text-slate-600 font-bold rounded-xl px-4 py-2",
        },
      }}
      icons={{
        success: (
          <div className="shrink-0 p-2 rounded-full bg-[oklch(0.75_0.12_165/0.1)] mr-8">
            <CircleCheckIcon className="size-8 text-[oklch(0.75_0.12_165)]" />
          </div>
        ),
        info: (
          <div className="shrink-0 p-2 rounded-full bg-slate-100 mr-8">
            <InfoIcon className="size-8 text-slate-600" />
          </div>
        ),
        warning: (
          <div className="shrink-0 p-2 rounded-full bg-amber-50 mr-8">
            <TriangleAlertIcon className="size-8 text-amber-500" />
          </div>
        ),
        error: (
          <div className="shrink-0 p-2 rounded-full bg-[oklch(0.7_0.18_350/0.1)] mr-8">
            <OctagonXIcon className="size-8 text-[oklch(0.7_0.18_350)]" />
          </div>
        ),
        loading: (
          <div className="shrink-0 p-2 rounded-full bg-slate-50 mr-8">
            <Loader2Icon className="size-8 text-slate-400 animate-spin" />
          </div>
        ),
      }}
      {...props}
    />
  );
};

export { Toaster };
