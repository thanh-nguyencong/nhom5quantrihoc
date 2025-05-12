import {Button} from "~/components/ui/button";
import {Link, useSearchParams} from "react-router";
import {useMutation, useQuery, useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import axios from "axios";
import {serverUrl} from "~/lib/utils";
import {useState} from "react";
import {Skeleton} from "~/components/ui/skeleton";

async function checkAuthenticationStatus() {
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

async function verifyEmail(email: string, verificationCode: string, oneTimeToken: string) {
    const {data, status} = await axios.post(`${serverUrl()}/verify_email`, {
        email,
        verification_code: verificationCode,
        one_time_token: oneTimeToken
    })
    if (status === 200) {
        localStorage.setItem("jwt", data.jwt)
        localStorage.setItem("email", data.email)
        localStorage.setItem("name", data.name)
        localStorage.setItem("group", data.group)
        return data
    }
}

export default function VerifyEmail() {

    const { data: isAuthenticated, error: isAuthenticatedError, isLoading: isAuthenticatedLoading } = useSuspenseQuery({
        queryKey: ["is_authenticated"],
        queryFn: async () => {
            return await checkAuthenticationStatus()
        }
    })
    if (isAuthenticatedLoading)
    {
        return <div className={"space-y-1"}>
            <Skeleton className="h-4 w-[250px]"/>
            <Skeleton className="h-8 w-[300px]"/>
            <Skeleton className="h-6 w-[100px]"/>
        </div>
    }
    if (isAuthenticated)
    {
        window.open("/training", "_self")!.focus()
    }
    const [searchParams, setSearchParams] = useSearchParams();
    const email = searchParams.get('email') ?? ""
    const name = searchParams.get('name') ?? ""
    const verificationCode = searchParams.get('verification_code') ?? ""
    const oneTimeToken = searchParams.get('one_time_token') ?? ""
    const [verificationCountdown, setVerificationCountdown] = useState(10)

    const interval = setInterval(() => {
        setVerificationCountdown(verificationCountdown - 1)
        if (verificationCountdown === 0) {
            clearInterval(interval)
        }
    }, 1_000)

    // Queries
    const {data, error, isFetching} = useSuspenseQuery({
        queryKey: ["email_verify"],
        queryFn: () => verifyEmail(email, verificationCode, oneTimeToken)
    })

    if (error) {
        return <>
            <h1>Đã gặp lỗi khi xác thực mail</h1>
            <p>Nhờ bạn thử lại dùm nhóm mình nha :(</p>
            <Button asChild>
            <Link to="/">Xác thực lại</Link>
            </Button>
        </>
    }

    if (isFetching)
    {
        if (verificationCountdown > 0)
        {
        return <>
            <h1 className={"text-lg font-semibold"}>Đang xác thực</h1>
            <p>Bạn sẽ vào trò chơi trong vòng chưa đầy {verificationCountdown} giây nữa.</p>
            </>
        }
        return <>
            <h1>Đã gặp lỗi khi xác thực mail</h1>
            <p>Nhờ bạn thử lại dùm nhóm mình nha :(</p>
            <Button asChild>
                <Link to="/">Xác thực lại</Link>
            </Button>
        </>
    }

    window.open("/training", "_self")!.focus()
}