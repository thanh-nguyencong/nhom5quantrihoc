import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from "axios";
import {Separator} from "@radix-ui/react-select";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isDev() {
    return true
}

export function serverUrl() {
  return isDev() ? "http://localhost:8000" : "https://nhom5quantrihoc-server.thinghives.com"
}

export async function checkAuthenticationStatus()  {
    const jwt = localStorage.getItem("jwt")
    if (!jwt) {
        return false
    }
    const {data, status} = await axios.get(`${serverUrl()}/is_authenticated`, {
        headers: {
            Authorization: jwt
        }
    })
    if (status === 200) {
        return data.is_authenticated
    }
    return false
}

export function ErrorPage(message: string) {
    return <div className={"flex flex-col items-center justify-center pt-4"}>
        <h1 className={"text-lg font-semibold"}>Đã có lỗi xảy ra</h1>
        <p className={"text-xs text-muted-foreground"}><i>Bạn vui lòng liên hệ ban tổ chức nha!</i></p>
        <Separator className={"mt-3 mb-8 w-full"}/>
        <p className={"text-sm"}><span className={"font-semibold"}>Nội dung lỗi:</span> <i>{message}</i></p>
    </div>
}