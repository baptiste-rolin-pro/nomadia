import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type Tone = "neutral" | "forest" | "terracotta" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ivory-deep text-ink",
  forest: "bg-forest-soft text-forest",
  terracotta: "bg-terracotta-soft text-terracotta",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClasses[tone]} ${className}`}>{children}</span>;
}

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <Badge tone="terracotta" className={className}>
      Démo · fictif
    </Badge>
  );
}

const noticeIcon = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };
const noticeTone = {
  info: "border-forest/25 bg-forest-soft text-ink",
  success: "border-success/30 bg-success-soft text-ink",
  warning: "border-warning/35 bg-warning-soft text-ink",
  danger: "border-danger/35 bg-danger-soft text-ink",
};
const noticeIconColor = { info: "text-forest", success: "text-success", warning: "text-warning", danger: "text-danger" };

export function Notice({ tone = "info", title, children, className = "", role }: { tone?: keyof typeof noticeIcon; title?: ReactNode; children?: ReactNode; className?: string; role?: "status" | "alert" }) {
  const Icon = noticeIcon[tone];
  return (
    <div role={role} className={`flex gap-3 rounded-[var(--radius-md)] border p-4 text-sm leading-relaxed ${noticeTone[tone]} ${className}`}>
      <Icon aria-hidden className={`mt-0.5 size-5 shrink-0 ${noticeIconColor[tone]}`} />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, intro, id, as = "h2" }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; id?: string; as?: "h1" | "h2" }) {
  const H = as;
  return (
    <div className="max-w-2xl">
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <H id={id} className={`font-serif ${as === "h1" ? "text-title" : "text-heading"} text-balance`}>
        {title}
      </H>
      {intro ? <p className="mt-4 text-lead text-ink-soft text-pretty">{intro}</p> : null}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-ink-soft">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {item.href && i < items.length - 1 ? (
              <a href={item.href} className="underline-offset-4 hover:underline">
                {item.label}
              </a>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className={i === items.length - 1 ? "text-ink" : ""}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-white/60 p-8 text-center">
      <p className="font-serif text-xl">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-prose text-sm text-ink-soft">{children}</div> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}
