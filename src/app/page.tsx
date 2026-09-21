import Image from "next/image";
import { socials } from "@/data/socials";
import { experience, companies } from "@/data/experience";

function SectionHeader({
  index,
  title,
  count,
}: {
  index: string;
  title: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="font-mono text-[11px] tracking-[0.18em] text-accent">
        {index}
      </span>
      <h2 className="font-display text-sm font-semibold uppercase tracking-[0.22em]">
        {title}
      </h2>
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[11px] tracking-[0.18em] text-muted">
        {String(count).padStart(2, "0")}
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <div>
      {/* Intro */}
      <section className="mb-20">
        <p className="label mb-4">
          <span className="text-accent">{"//"}</span> Pilot &middot; Entrepreneur
          &middot; Builder
        </p>
        <h1 className="font-display text-5xl sm:text-[4.25rem] font-bold uppercase tracking-tight leading-[0.95] mb-4">
          London Zade
          <span aria-hidden="true" className="blink text-accent">
            _
          </span>
        </h1>
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted mb-6">
          Corporate pilot for{" "}
          <a
            href="https://www.flyslate.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground border-b border-border-strong hover:border-accent hover:text-accent transition-colors"
          >
            Slate Aviation
          </a>
        </p>
        <p className="text-[15px] leading-relaxed max-w-lg text-foreground/80">
          Pilot, entrepreneur, and builder. I fly jets, former wrencher on
          fighters in the Air National Guard, I build companies and apps on the
          side. Always chasing the next thing worth building.
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          {socials.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition-all hover:border-accent hover:text-foreground hover:shadow-[0_0_14px_var(--accent-glow)]"
            >
              {label}
              <span className="text-accent transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                &#8599;
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section className="mb-16">
        <SectionHeader index="01" title="Experience" count={experience.length} />
        <div className="tech-card divide-y divide-border">
          {experience.map((item, i) => (
            <a
              key={`${item.company}-${item.date}`}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-highlight"
            >
              <span className="hidden sm:block w-5 font-mono text-[10px] tracking-[0.14em] text-muted/60 group-hover:text-accent transition-colors">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white border border-border ring-1 ring-black/[0.02]">
                <Image
                  src={item.logo}
                  alt={item.company}
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain grayscale transition-[filter] duration-300 group-hover:grayscale-0"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight tracking-tight">
                  {item.title}
                </p>
                <p className="text-sm text-muted">{item.company}</p>
              </div>
              <span className="text-[11px] font-mono text-muted shrink-0 tracking-[0.08em] group-hover:text-accent transition-colors">
                {item.date}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Companies */}
      <section>
        <SectionHeader index="02" title="Companies" count={companies.length} />
        <div className="tech-card divide-y divide-border">
          {companies.map((item, i) => (
            <div
              key={item.name}
              className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-highlight"
            >
              <span className="hidden sm:block w-5 font-mono text-[10px] tracking-[0.14em] text-muted/60 group-hover:text-accent transition-colors">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white border border-border ring-1 ring-black/[0.02] p-1.5">
                {item.logo ? (
                  <Image
                    src={item.logo}
                    alt={item.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xs font-semibold text-muted">
                    {item.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                )}
              </div>
              <p className="flex-1 font-display text-sm font-semibold tracking-[0.06em]">
                {item.name}
              </p>
              <span className="text-[11px] font-mono text-muted shrink-0 tracking-[0.08em] group-hover:text-accent transition-colors">
                {item.date}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
