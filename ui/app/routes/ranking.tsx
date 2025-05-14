import {useSuspenseQuery} from "@tanstack/react-query";
import {useState} from "react";
import axios from "axios";
import {serverUrl} from "~/lib/utils";
import {Separator} from "~/components/ui/separator";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow
} from "~/components/ui/table";

export default function Ranking() {
    const [loading, setLoading] = useState(false); // Tracks if submission is in progress
    const { data: ranking } = useSuspenseQuery({
        queryKey: ["ranking"],
        queryFn: async () => {
            setLoading(true);
            try {
                const {data, status} = await axios.get(`${serverUrl()}/ranking`)
                return data.ranking
            } catch (e) {
                if (e && axios.isAxiosError(e)) {
                    alert(`Đã có lỗi xảy ra, nội dung lỗi: ${e.response!.data.detail}`)
                }
            }
            setLoading(false);
            return []
        }
    })

    return <div className={"flex flex-col justify-center items-center pt-4"}>
        <div className={"flex flex-col items-center space-y-2"}>
            <h1 className={`font-semibold text-lg`}>BẢNG XẾP HẠNG</h1>
            <p className={"text-xs text-muted-foreground"}>👑 Thợ săn AI muôn năm 👑</p>
            <Separator className={"mt-1 w-full"}/>
        </div>
        <Table>
            <TableCaption>A list of your recent invoices.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Nhóm</TableHead>
                    <TableHead>Điểm</TableHead>
                    <TableHead>Điểm thô</TableHead>
                    <TableHead>Email</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {ranking.map((rank) => (
                    <TableRow key={rank.email}>
                        <TableCell>{rank.name} {ranking.slice(0, 3).includes(rank) && ranking.scaled_score > 0 ? "⭐" : ""}</TableCell>
                        <TableCell>{rank.group}</TableCell>
                        <TableCell>{rank.scaled_score}</TableCell>
                        <TableCell>{rank.score.toFixed(2)}</TableCell>
                        <TableCell>{rank.email}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3}>Tổng điểm thô</TableCell>
                    <TableCell className="text-right">{Number(ranking.reduce((sum, rank) => sum + rank.score, 0))}</TableCell>
                </TableRow>
            </TableFooter>
        </Table>
    </div>
}