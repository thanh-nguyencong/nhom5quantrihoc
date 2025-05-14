import {Button} from "~/components/ui/button";
import axios from "axios";
import {serverUrl} from "~/lib/utils";

async function handleAllowSubmission() {
    const { data, status } = await axios.post(`${serverUrl()}/allow_submissions`,
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
    const { data, status } = await axios.post(`${serverUrl()}/disallow_submissions`,
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

export default function Group5() {
    return <div className={"flex flex-col justify-center items-center space-y-4 pt-8"}>
        <h1 className={"font-semibold text-lg"}>Group 5</h1>
        <Button
            onClick={handleAllowSubmission}
            className={"w-[20rem]"}
            variant={"default"}
        >Allow Submissions</Button>
        <Button
            onClick={handleDisallowSubmission}
            className={"w-[20rem]"}
            variant={"destructive"}
        >Disallow Submissions</Button>
    </div>
}