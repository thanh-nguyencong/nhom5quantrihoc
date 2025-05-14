import {Button} from "~/components/ui/button";
import {type MouseEvent, type TouchEvent, useRef, useState} from "react";
import axios from "axios";
import {checkAuthenticationStatus, ErrorPage, serverUrl} from "~/lib/utils";
import {Trash} from "lucide-react";
import {Separator} from "~/components/ui/separator";
import {useSuspenseQuery} from "@tanstack/react-query";
import {Skeleton} from "~/components/ui/skeleton";

function redirectToRankingBecauseSubmissionNotAllowed() {
    alert("Hiện tại AI đang mệt, bạn theo dõi bảng xếp hạng nha!")
    window.open("/ranking", "_self")!.focus()
}

export default function Game() {
    const { data: isAuthenticated, isLoading: isAuthenticatedLoading } = useSuspenseQuery({
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
    if (!isAuthenticated)
    {
        window.open("/", "_self")!.focus()
    }

    const [matrix, setMatrix] = useState<number[][]>(() =>
        Array.from({length: 28}, () => Array(28).fill(0)) // Initialize a 28x28 matrix with values set to 0
    );

    const { data, error, isPending } = useSuspenseQuery({
        queryKey: ["begin_challenge"],
        queryFn: async () => {
            try {
                const response = await axios.get(`${serverUrl()}/begin_challenge`, {
                    headers: {
                        "Authorization": localStorage.getItem("jwt")
                    }
                })
                const { data, status } = response
                if (status !== 200) {
                    return false
                }
                return data
            } catch (e) {
                if (e && axios.isAxiosError(e) && e.response!.data.detail.includes("submissions are not allowed")) {
                    redirectToRankingBecauseSubmissionNotAllowed()
                }
                if (e && axios.isAxiosError(e) && e.response!.data.detail.includes("your challenge has begun")) {
                    return { ok: false }
                }
                throw e
            }
        }
    })

    if (isPending) {
        return <Skeleton className={"my-4"}/>
    }

    if (error && axios.isAxiosError(error)) {
        return ErrorPage(error.response!.data.detail)
    }

    const { data: isSubmissionAllowed, error: isSubmissionAllowedError, isPending: isSubmissionAllowedIsPending } = useSuspenseQuery({
        queryKey: ["is_submission_allowed"],
        queryFn: async () => {
            const { data, status } = await axios.get(`${serverUrl()}/is_submission_allowed`)
            if (status !== 200) {
                return false
            }
            return data.allowed
        }
    })

    if (isSubmissionAllowedIsPending) {
        return <Skeleton className={"my-4"}/>
    }

    if (!isSubmissionAllowed)
    {
        redirectToRankingBecauseSubmissionNotAllowed()
    }

    const [predictionResponse, setPredictionResponse] = useState<{ time_span: number, prediction: number, confidence: number }>({
        time_span: -1,
        prediction: -1,
        confidence: 0,
    });

    const [isDrawing, setIsDrawing] = useState(false); // Tracks whether the mouse is down
    const [loading, setLoading] = useState(false); // Tracks if submission is in progress
    const gridRef = useRef<HTMLDivElement | null>(null); // Ref to the grid container
    const cellSize = 12; // Size of each cell in px (adjust as needed)

    // Calculate row and column from mouse or touch position
    const calculateRowCol = (event: MouseEvent | TouchEvent) => {
        const getCurrentRem = () => {
          return parseFloat(getComputedStyle(document.documentElement).fontSize);
        };

        const currentRemValue = getCurrentRem();

        const gridPadding = 8 * 0.25 * currentRemValue

        // Retrieve the bounding rectangle of the grid
        const gridRect = gridRef.current!.getBoundingClientRect();

        // Get the x/y coordinates (handle both mouse and touch)
        const clientX = ('touches' in event) ? event.touches[0].clientX : event.clientX;
        const clientY = ('touches' in event) ? event.touches[0].clientY : event.clientY;

        // Calculate row and col based on mouse position
        const col = Math.floor((clientX - gridRect.left - gridPadding) / cellSize);
        const row = Math.floor((clientY - gridRect.top - gridPadding) / cellSize);

        // Ensure row & col are within matrix bounds
        return { row: Math.max(0, Math.min(27, row)), col: Math.max(0, Math.min(27, col)) };
    };

    // Handles mouse down event (start drawing)
    const handleMouseDown = (event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>, row: number, col: number) => {
        event.preventDefault()
        setIsDrawing(true);
        updateCell(row, col, 1);
    };

    // Handles mouse up event (stop drawing)
    const handleMouseUp = (event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
        event.preventDefault()
        setIsDrawing(false);
    };

    // Handles mouse enter on a cell (draw if mouse is down)
    const handleMouseEnter = (event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
        event.preventDefault()
        const { row, col } = calculateRowCol(event);
        if (isDrawing) {
            updateCell(row, col, 1)
            // neighbors should also be affected a bit
            const scale = 0.5
            const affectProbability = 0.8
            col > 0 && Math.random() < affectProbability && updateCell(row, col - 1, Math.max(matrix[row][col - 1], Math.random() * scale))
            col < 27 && Math.random() < affectProbability && updateCell(row, col + 1, Math.max(matrix[row][col + 1], Math.random() * scale))
            row > 0 && Math.random() < affectProbability && updateCell(row - 1, col, Math.max(matrix[row - 1][col], Math.random() * scale))
            row < 27 && Math.random() < affectProbability && updateCell(row + 1, col, Math.max(matrix[row + 1][col], Math.random() * scale))
        }
    };

    // Updates the brightness (value) of the cell
    const updateCell = (row: number, col: number, value: number) => {
        setMatrix((prevMatrix): number[][] => {
            const newMatrix = [...prevMatrix];
            newMatrix[row] = [...newMatrix[row]];
            newMatrix[row][col] = value;
            return newMatrix;
        });
    };

    // Handles the submission of the matrix
    const handleSubmit = async () => {
        setLoading(true);
        try {
            const {data, status} = await axios.post(`${serverUrl()}/submit`, {
                submission: matrix
            }, {
                headers: {
                    "Authorization": localStorage.getItem("jwt")
                }
            });
            if (status === 200) {
                setPredictionResponse(data);
            }
        } catch (e) {
            if (e && axios.isAxiosError(e)) {
                alert(`Đã có lỗi xảy ra, nội dung lỗi: ${e.response!.data.detail}`)
            }
        }
        setLoading(false);

    };

    const handleGoToGame = () => {
        window.open("/game", "_self")!.focus()
    }

    return <div className={"flex flex-col justify-center items-center pt-4"}>
        <div className={"flex flex-col items-center space-y-2"}>
            <h1 className={`font-semibold text-lg ${predictionResponse.prediction === -1 ? "rainbow-text" : "text-primary"}`}>ĐÁNH LỪA AI</h1>
            <p className={"text-xs text-muted-foreground"}>🤖 Ngày tàn của AI đã tới! 🤖</p>
            <Separator className={"mt-1 w-full"}/>
        </div>
        <div ref={gridRef} className={"grid grid-cols-28 grid-rows-28 h-100 w-100 p-8 rounded-xl touch-none"}>
            {
                matrix.map((row, i) => {
                    return row.map((cell, j) => {
                            return <div
                                id={`cell-${i}-${j}`}
                                key={`${i}-${j}`}
                                onMouseDown={(event) => handleMouseDown(event, i, j)}
                                onTouchStart={(event) => handleMouseDown(event, i, j)}
                                onMouseUp={(event) => handleMouseUp(event)}
                                onTouchEnd={(event) => handleMouseUp(event)}
                                onMouseEnter={(event) => handleMouseEnter(event)}
                                onTouchMove={(event) => handleMouseEnter(event)}
                            >
                                <div
                                    className={`size-[10px] rounded-full touch-auto`}
                                    style={{
                                        backgroundColor: `rgba(255, 255, 255, ${cell})`,
                                        outline: `1px solid var(--primary-foreground)`,
                                    }}
                                ></div>
                            </div>
                        })
                    }
                )}
        </div>
        { predictionResponse.prediction !== -1 &&
            <div className={"w-[20rem] col-[1/span_2] dark:bg-accent p-2 mb-7 flex items-center justify-center border rounded-xl"}>
                Bạn khiến AI tự tin {Math.round(100 * predictionResponse.confidence)}% kết quả là {predictionResponse.prediction} trong vòng { predictionResponse.time_span > 1000 ? (predictionResponse.time_span / 1000).toFixed(2) : Math.round(predictionResponse.time_span) + " milliseconds"}
            </div> }
        <div className={"w-[20rem] grid grid-cols-[80%_20%] grid-rows-[10%_40%_50%] gap-x-2 gap-y-2"}>
            <Separator className={"mt-1 mb-4 w-full col-[1/span_2]"}/>
            <Button
                disabled={loading}
                onClick={handleSubmit}
                className={"col-1"}
            >
                {loading ? "Đang tấn công..." : "Tấn công!"}
            </Button>
            <Button
                onClick={() => {
                    setMatrix(Array.from({length: 28}, () => Array(28).fill(0)))
                    setPredictionResponse({time_span: -1, prediction: -1, confidence: 0})
                }}
                variant={"destructive"}
                className={"col-2"}
            >
                <Trash/>
            </Button>
        </div>
    </div>
}