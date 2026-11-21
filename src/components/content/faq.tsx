import { ChevronDown } from "lucide-react";

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.q} className="group py-1">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown aria-hidden className="size-5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <p className="pb-4 text-ink-soft">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
