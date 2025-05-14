import {Button} from "~/components/ui/button";
import axios from "axios";
import {ErrorPage, serverUrl} from "~/lib/utils";
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Skeleton} from "~/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "~/components/ui/select";

async function handleAllowSubmission() {
    const {data, status} = await axios.post(`${serverUrl()}/allow_submissions`,
        {},
        {
            headers: {
                "Authorization": localStorage.getItem("jwt")
            }
        })
    if (status === 200) {
        alert(`Submission allowed: ${data.allowed}`)
    }
}

async function handleDisallowSubmission() {
    const {data, status} = await axios.post(`${serverUrl()}/disallow_submissions`,
        {},
        {
            headers: {
                "Authorization": localStorage.getItem("jwt")
            }
        })
    if (status === 200) {
        alert(`Submission allowed: ${data.allowed}`)
    }
}

async function handleClearSubmissions(email: string) {
    if (email === "") {
        alert("No email provided")
    } else {
        try {
            const {data} = await axios.post(`${serverUrl()}/clear_submissions`, {
                email: email
            }, {
                headers: {
                    "Authorization": localStorage.getItem("jwt")
                }
            })
            alert(data.email)
        } catch (e) {
            if (e && axios.isAxiosError(e)) {
                alert()
            }
        }
    }
}

async function handleClearSubmissionsForEveryone() {
    try {
        const {data} = await axios.post(`${serverUrl()}/clear_all_submissions`, {}, {
            headers: {
                "Authorization": localStorage.getItem("jwt")
            }
        })
        alert(data.ok)
    } catch (e) {
        if (e && axios.isAxiosError(e)) {
            alert("Can't clear submissions for everyone. Please try again later.")
        }
    }
}


export default function Group5() {
    const [emailToClearSubmissions, setEmailToClearSubmissions] = useState("")

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
            <Skeleton className="h-6 w-[250px]"/>
            <Skeleton className="h-10 w-[300px]"/>
            <Skeleton className="h-8 w-[100px]"/>
        </div>
    }

    if (error && axios.isAxiosError(error)) {
        return ErrorPage(error.response!.data.detail)
    }

    return <div className={"flex flex-col justify-center items-center space-y-4 pt-8"}>
        <h1 className={"font-semibold text-lg"}>Group 5</h1>
        <Button
            onClick={handleAllowSubmission}
            className={"w-[30rem]"}
            variant={"default"}
        >Allow Submissions</Button>
        <Button
            onClick={handleDisallowSubmission}
            className={"w-[30rem]"}
            variant={"destructive"}
        >Disallow Submissions</Button>
        <div className={"w-[30rem] flex space-x-2"}>
            <Select onValueChange={setEmailToClearSubmissions}>
                <SelectTrigger className="w-[20rem]">
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
            <Button
                onClick={() => handleClearSubmissions(emailToClearSubmissions)}
                disabled={!emailToClearSubmissions}
            >Xoá mọi bài nộp của bạn này</Button>
        </div>
        <Button
            className={"w-[30rem]"}
            onClick={handleClearSubmissionsForEveryone}
        >Xoá bài nộp của tất cả mọi người</Button>
    </div>
}