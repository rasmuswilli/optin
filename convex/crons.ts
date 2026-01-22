import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
    "cleanup expired opt-ins",
    { minutes: 1 },
    api.optIns.cleanupExpiredOptIns,
);

export default crons;
