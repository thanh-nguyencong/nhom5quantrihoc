import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("verify_email", "routes/verify_email.tsx"),
    route("training", "routes/training.tsx"),
    route("game", "routes/game.tsx"),
    route("ranking", "routes/ranking.tsx"),
    route("group5", "routes/group5.tsx"),
    route("evaluate_submissions", "routes/evaluate_submissions.tsx"),
    route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
