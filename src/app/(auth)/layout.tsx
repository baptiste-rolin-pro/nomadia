import Image from "next/image";
import { photo } from "@/lib/content/photos";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const p = photo("madere-1");
  return (
    <div className="container-page grid min-h-[70vh] gap-10 pt-10 lg:grid-cols-2 lg:items-center">
      <div className="mx-auto w-full max-w-md">{children}</div>
      <figure className="relative hidden aspect-[4/5] overflow-hidden rounded-[var(--radius-xl)] lg:block">
        <Image src={p.src} alt={p.alt} fill sizes="45vw" quality={70} className="object-cover" />
        <figcaption className="absolute bottom-3 left-3 rounded bg-ink/60 px-2 py-1 text-xs text-white">
          {p.place} — {p.author}, {p.license}
        </figcaption>
      </figure>
    </div>
  );
}
