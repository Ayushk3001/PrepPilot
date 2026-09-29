// @ts-nocheck
import { Play, BookOpen, FileText, GraduationCap, ArrowUpRight } from "lucide-react";
import { RESOURCE_LIBRARY } from "@/lib/resources";

const ICONS = { youtube: Play, docs: BookOpen, article: FileText };

export default function ResourceList({ topics = [], resources, dark = false, testPrefix = "resources" }: any) {
  if (resources) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid={`${testPrefix}-recommended-list`}>
        {resources.map((resource) => (
          <article
            key={resource.id || resource.url}
            className={`border-2 border-line p-5 transition-transform duration-150 hover:-translate-y-0.5 ${
              dark ? "bg-coal2 shadow-[4px_4px_0_#C7FF2F]" : "bg-white shadow-[4px_4px_0_#111111]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="chip !text-[10px] font-mono !bg-[#C7FF2F] !text-ink">{resource.type}</span>
              <span className="font-mono text-xs text-mut font-bold">{resource.duration}</span>
            </div>
            <h4 className={`mt-3 font-display text-base font-bold leading-snug ${dark ? "text-paper" : "text-ink"}`}>
              {resource.title}
            </h4>
            <p className={`mt-2 text-xs leading-relaxed ${dark ? "text-paper/70" : "text-ink2"}`}>
              {resource.reason}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-mut">
              {resource.topic} · {resource.source}
            </p>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-ink bg-paper px-3 py-1.5 border-2 border-line shadow-[2px_2px_0_#111111] hover:bg-[#C7FF2F] transition-colors"
            >
              ACCESS RESOURCE <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid={`${testPrefix}-list`}>
      {topics.map((id) => {
        const t = RESOURCE_LIBRARY[id];
        if (!t) return null;
        return (
          <div
            key={id}
            className={`border-2 border-line p-6 ${
              dark ? "bg-coal2 shadow-[4px_4px_0_#C7FF2F]" : "bg-white shadow-[4px_4px_0_#111111]"
            }`}
            data-testid={`${testPrefix}-topic-${id}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-line bg-[#C7FF2F] text-ink">
                <GraduationCap className="h-5 w-5" />
              </span>
              <div>
                <p className={`font-display text-base font-bold uppercase tracking-tight ${dark ? "text-paper" : "text-ink"}`}>{t.label}</p>
                <p className={`mt-0.5 text-xs ${dark ? "text-paper/60" : "text-mut"}`}>{t.blurb}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {t.items.map((it) => {
                const Icon = ICONS[it.type] || FileText;
                return (
                  <a
                    key={it.url}
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`${testPrefix}-link-${it.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`}
                    className={`group flex items-center justify-between gap-3 border-2 border-line px-4 py-3 transition-all hover:translate-x-1 ${
                      dark ? "bg-coal hover:bg-coal3" : "bg-paper hover:bg-[#C7FF2F]"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-ink" />
                      <span className={`truncate text-xs font-bold uppercase tracking-wide ${dark ? "text-paper" : "text-ink"}`}>
                        {it.label}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-mut group-hover:text-ink">
                      {it.source}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
