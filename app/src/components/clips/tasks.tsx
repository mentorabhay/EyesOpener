// Eyes Opener: The screen part of every template. The compiler refuses a template with no part. .
"use client";
import type { ComponentType } from "react";
import type { Template } from "@/data/clips";
import { AlignClip } from "./align";
import { AutoTask } from "./auto";
import { CameraTask } from "./camera";
import { ChooseTask } from "./choose";
import { CountTask } from "./count";
import { GridTask } from "./grid";
import { LookTask } from "./look";
import { MatchTask } from "./match";
import { MeasureTask } from "./measure";
import { PickTask } from "./pick";
import { ReadTask } from "./read";
import { FindTask, HoldTask, SplitTask } from "./scene";
import { SpotsTask } from "./spots";
import { SurveyTask } from "./survey";
import type { TaskProps } from "./types";

/** The screen part of every template. The compiler refuses a template with no part. */
export const TASKS: Record<Template, ComponentType<TaskProps>> = {
  look: LookTask, count: CountTask, match: MatchTask, measure: MeasureTask, camera: CameraTask, auto: AutoTask,
  choose: ChooseTask, spots: SpotsTask, pick: PickTask, split: SplitTask, hold: HoldTask, align: AlignClip,
  grid: GridTask, find: FindTask, read: ReadTask, survey: SurveyTask,
};
