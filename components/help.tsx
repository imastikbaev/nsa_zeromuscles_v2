"use client";
import { useI18n } from "./preferences";
import { CircleHelp } from "lucide-react";
import { glossary } from "@/lib/data";
export function Help({ term }: { term: string }) {
  const { t, tx, localeTag } = useI18n();

  return (
    <span
      className="help"
      tabIndex={0}
      aria-label={t(`${term}: ${glossary[term]}`)}
    >
      <CircleHelp size={12} />
      <span role="tooltip">{tx(glossary[term])}</span>
    </span>
  );
}
