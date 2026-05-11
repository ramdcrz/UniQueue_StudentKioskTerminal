"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueue } from "@/context/QueueContext";
import { useToast } from "@/hooks/use-toast";

export function GlobalNavShortcuts() {
  const router = useRouter();
  const { isAdmin } = useQueue();
  const { toast } = useToast();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!isAdmin) {
      hasShownToast.current = false;
      return;
    }

    if (!hasShownToast.current) {
      toast({
        title: "Admin Shortcuts Enabled",
        description: "Press Alt+K, M, S, or A to navigate.",
        duration: 5000,
      });
      hasShownToast.current = true;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Safety Checks: ignore if activeElement is an input, textarea, or select
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toUpperCase();
        if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
          return;
        }
      }

      if (e.altKey) {
        let handled = false;
        switch (e.code) {
          case "KeyK":
            router.push("/kiosk");
            handled = true;
            break;
          case "KeyM":
            router.push("/monitor");
            handled = true;
            break;
          case "KeyS":
            router.push("/staff");
            handled = true;
            break;
          case "KeyA":
            router.push("/admin");
            handled = true;
            break;
          case "KeyH":
          case "Slash":
            router.push("/");
            handled = true;
            break;
        }
        if (handled) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdmin, router, toast]);

  return null;
}
