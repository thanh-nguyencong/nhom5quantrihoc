import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isDev() {
    return false
}

export function serverUrl() {
  return isDev() ? "http://localhost:8000" : "https://nhom5quantrihoc-server.thinghives.com"
}