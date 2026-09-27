import { ensureMonitorSchedulerStarted } from "@/lib/monitors/scheduler";
import { ensureRetentionSweepStarted } from "@/lib/retention";

ensureMonitorSchedulerStarted();
ensureRetentionSweepStarted();
