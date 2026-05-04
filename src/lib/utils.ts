import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats decimal minutes into a human-readable duration string.
 * Example: 43.6 -> "43m 36s"
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0s";
  
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  
  return `${mins}m ${secs}s`;
}

/**
 * Formats a date into a relative time string.
 * Example: "Just now", "5 mins ago"
 */
export function formatRelativeTime(date: string | Date): string {
  if (!date) return "—";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  // If the date is invalid
  if (isNaN(dateObj.getTime())) return "—";
  
  const distance = formatDistanceToNow(dateObj, { addSuffix: true });
  
  // Custom tweaks for "less than a minute"
  if (distance.includes("less than a minute")) {
    return "Just now";
  }
  
  return distance;
}
