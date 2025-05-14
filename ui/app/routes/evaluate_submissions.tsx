import {useSuspenseQuery} from "@tanstack/react-query";
import axios from "axios";
import {serverUrl} from "~/lib/utils";
import {useState} from "react";
import {Separator} from "~/components/ui/separator";
import {Button} from "~/components/ui/button";

export default function EvaluateSubmissions() {
    const {data: submissions, error, isPending} = useSuspenseQuery({
        queryKey: ["get_submissions"],
        queryFn: async () => {
            try {
                const {data} = await axios.get(`${serverUrl()}/get_submissions`, {
                    headers: {
                        Authorization: localStorage.getItem("jwt")
                    }
                })
                return data.submissions
            } catch (e) {
                if (e && axios.isAxiosError(e)) {
                    alert("Bạn không được vào trang này.")
                    window.open("/", "_self")!.focus()
                }
            }
        }
    })

    const [currentPage, setCurrentPage] = useState(1)

    const initialEvaluations: { email: string, evaluated: boolean, ground_truth: boolean; }[] = []
    for (let i = 0; i < submissions.length; i++) {
        initialEvaluations.push({
            email: submissions[i].email,
            evaluated: false,
            ground_truth: false
        })
    }
    const [evaluations, setEvaluations] = useState<{ email: string, evaluated: boolean, ground_truth: boolean; }[]>(initialEvaluations)


    const handleEvaluation = async (page: number, ground_truth: boolean) => {
        const newEvaluations = [...evaluations]
        newEvaluations[page - 1].evaluated = true
        newEvaluations[page - 1].ground_truth = ground_truth
        setEvaluations(newEvaluations)
        if (page >= submissions.length) {
            await axios.post(`${serverUrl()}/evaluate_submissions`, {
                evaluations: newEvaluations
            }, {
                headers: {
                    "Authorization": localStorage.getItem("jwt")
                }
            })
        }
        setCurrentPage(page + 1)
    }

    if (currentPage > submissions.length) {
        return <div className={"flex flex-col items-center justify-center space-y-2 pt-4"}>
            <h1 className={"text-lg font-semibold"}>Đánh giá AI</h1>
            <p>Hoàn tất</p>
        </div>
    }

    const submission = submissions[currentPage - 1].submission
    const matrix: number[][] = submission.submission
    return <div className={"flex flex-col items-center justify-center space-y-2 pt-4"}>
        <h1 className={"text-lg font-semibold"}>Đánh giá AI</h1>
        <p className={"text-xs"}>{currentPage}/{submissions.length}</p>
        <div className={"grid grid-cols-28 grid-rows-28 h-100 w-100 p-8 rounded-xl touch-none"}>
            {
                matrix.map((row, i) => {
                        return row.map((cell, j) => {
                            return <div
                                id={`cell-${i}-${j}`}
                                key={`${i}-${j}`}
                                >
                                <div
                                    className={`size-[10px] rounded-full outline touch-auto`}
                                    style={{backgroundColor: `rgba(255, 255, 255, ${cell})`}}
                                ></div>
                            </div>
                        })
                    }
                )}
        </div>
        <div className={"w-[20rem] col-[1/span_2] dark:bg-accent p-2 mb-7 flex items-center justify-center border rounded-xl"}>
            AI nói đây là số {submission.prediction}
        </div>
        <div className={"w-[20rem] grid grid-cols-[50%_50%] grid-rows-[10%_40%_50%] gap-x-2 gap-y-2"}>
            <Separator className={"mt-1 mb-4 w-full col-[1/span_2]"}/>
            <Button
                onClick={() => handleEvaluation(currentPage, true)}
                className={"col-1"}
            >
                Hợp lý
            </Button>
            <Button
                onClick={() => handleEvaluation(currentPage, false)}
                variant={"destructive"}
                className={"col-2"}
            >
                Sai
            </Button>
        </div>
    </div>
}