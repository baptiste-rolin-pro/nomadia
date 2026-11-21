import Image from "next/image";
import { photoIn } from "@/lib/content/localized";
import { ClientMessages, getI18n } from "@/i18n/request";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale, m, f } = await getI18n();
  const p = photoIn("madere-1", locale);
  return (
    <ClientMessages ns={["auth"]}>
      <div className="container-page grid min-h-[70vh] gap-10 pt-10 lg:grid-cols-2 lg:items-center">
        <div className="mx-auto w-full max-w-md">{children}</div>
        <figure className="relative hidden aspect-[4/5] overflow-hidden rounded-[var(--radius-xl)] lg:block">
          <Image src={p.src} alt={p.alt} fill sizes="45vw" quality={70} className="object-cover" />
          <figcaption className="absolute bottom-3 start-3 rounded bg-ink/60 px-2 py-1 text-xs text-white">{f.t(m.auth.photoCaption, { place: p.place, author: p.author, license: p.license })}</figcaption>
        </figure>
      </div>
    </ClientMessages>
  );
}
