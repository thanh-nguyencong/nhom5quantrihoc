import {Button} from "~/components/ui/button";
import {useQuery, useSuspenseQuery} from "@tanstack/react-query";
import axios from "axios";
import {serverUrl} from "~/lib/utils";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "~/components/ui/select";
import {useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "~/components/ui/dialog";
import {Skeleton} from "~/components/ui/skeleton";
import {Separator} from "~/components/ui/separator";

async function checkAuthenticationStatus()  {
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

async function requestEmailVerification(email: string) {
    const {data, status} = await axios.post(`${serverUrl()}/request_email_verification`, {
        email
    })
    if (status === 200) {
        return data
    }
}

export default function Home() {
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
    const [email, setEmail] = useState("")
    const [verificationCode, setVerificationCode] = useState("")
    const {data: studentGroups, error, isLoading} = useQuery({
        queryKey: ["students"],
        queryFn: async () => {
            const response = await axios.get(`${serverUrl()}/students`)
            const students = response.data
            return {
                1: students.filter((student: { group: string }) => student.group === "1"),
                2: students.filter((student: { group: string }) => student.group === "2"),
                3: students.filter((student: { group: string }) => student.group === "3"),
                4: students.filter((student: { group: string }) => student.group === "4"),
                5: students.filter((student: { group: string }) => student.group === "5"),
            }
        }
    });

    if (isLoading) {
        return <div className={"space-y-1"}>
            <Skeleton className="h-4 w-[250px]"/>
            <Skeleton className="h-8 w-[300px]"/>
            <Skeleton className="h-6 w-[100px]"/>
        </div>
    }

    return <div className={"flex flex-col items-center justify-center pt-4"}>
        <div className={"w-[20rem] flex flex-col items-center"}>
            <h1 className={"text-xl font-semibold mb-4"}>Xác thực</h1>
            <p className={"text-muted-foreground text-sm self-start"}><i>Bạn hãy xác thực để tiếp tục</i></p>
            <Separator className={"mt-3 mb-8 w-full"}/>
            <div className={"w-[20rem] flex space-x-2"}>
                <Select onValueChange={setEmail}>
                    <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Chọn tên của bạn"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Nhóm 1</SelectLabel>
                            {studentGroups![1].map((student: { name: string; email: string; }) => {
                                return <SelectItem key={student.email} value={student.email}>{student.name}</SelectItem>
                            })}
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>Nhóm 2</SelectLabel>
                            {studentGroups![2].map((student: { name: string; email: string; }) => {
                                return <SelectItem key={student.email} value={student.email}>{student.name}</SelectItem>
                            })}
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>Nhóm 3</SelectLabel>
                            {studentGroups![3].map((student: { name: string; email: string; }) => {
                                return <SelectItem key={student.email} value={student.email}>{student.name}</SelectItem>
                            })}
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>Nhóm 4</SelectLabel>
                            {studentGroups![4].map((student: { name: string; email: string; }) => {
                                return <SelectItem key={student.email} value={student.email}>{student.name}</SelectItem>
                            })}
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>Nhóm 5</SelectLabel>
                            {studentGroups![5].map((student: { name: string; email: string; }) => {
                                return <SelectItem key={student.email} value={student.email}>{student.name}</SelectItem>
                            })}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <Dialog>
                    <DialogTrigger
                        onClick={() => requestEmailVerification(email).then(data => setVerificationCode(data.verification_code))}
                        disabled={!email}>
                        <Button>Xác thực</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            {verificationCode
                                ? <>
                                    <DialogTitle>
                                        Vui lòng kiểm tra mail trường
                                    </DialogTitle>
                                    <DialogDescription>
                                        Bạn đã được cung cấp một mã xác thực. Đừng chia sẻ nó nhé!
                                    </DialogDescription>
                                    <Separator className="my-4"/>
                                    <div className={"flex flex-col items-center"}>
                                        <p className={"w-fit"}>Mã xác thực của bạn là</p>
                                        <span className={"text-4xl font-semibold"}>{verificationCode}</span>
                                    </div>
                                </>
                                : <>
                                    <DialogTitle>
                                        <Skeleton className="h-4 w-[250px]"/>
                                    </DialogTitle>
                                    <Skeleton className="h-4 w-[200px]"/>
                                    <Skeleton className="h-12 w-12 rounded-full"/>
                                </>}
                        </DialogHeader>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    </div>
}
