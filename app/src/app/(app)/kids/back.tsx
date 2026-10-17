// The way back to child mode's tiles, the same on every one of its pages.
import Link from "next/link";
import { kids as t } from "@/copy/kids";
import css from "./kids.module.css";

export const BackHome = () => <Link href="/kids" className={css.back}>{t.back}</Link>;
