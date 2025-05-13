import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("verify_email", "routes/verify_email.tsx"),
    route("training", "routes/training.tsx"),
    route("game", "routes/game.tsx"),
    route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
