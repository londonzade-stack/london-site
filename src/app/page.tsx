import Image from "next/image";
import { socials } from "@/data/socials";
import { experience, companies } from "@/data/experience";

export default function Home() {
  return (
    <div>
      {/* Intro */}
      <section className="mb-20">
        <h1 className="font-display text-5xl sm:text-6xl tracking-tight mb-2 leading-[1]">
          London Zade
        </h1>
        <p className="text-muted mb-5 text-[15px]">
          Corporate pilot for{" "}
          <a
            href="https://www.flyslate.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4 decoration-border-strong hover:decoration-foreground transition-all"
          >
            Slate Aviation
          </a>
        </p>
        <p className="text-[15px] leading-relaxed max-w-lg text-foreground/80">
          Pilot, entrepreneur, and builder. I fly jets, former wrencher on
          fighters in the Air National Guard, I build companies and apps on the
          side. Always chasing the next thing worth building.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
          {socials.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group text-sm text-muted hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              {label}
              <span className="transition-transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section className="mb-16">
        <h2 className="font-display text-2xl mb-5 tracking-tight">
          Experience
        </h2>
        <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
          {experience.map((item) => (
            <a
              key={`${item.company}-${item.date}`}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-highlight"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white border border-border ring-1 ring-black/[0.02]">
                <Image
                  src={item.logo}
                  alt={item.company}
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight group-hover:text-foreground">
                  {item.title}
                </p>
                <p className="text-sm text-muted">{item.company}</p>
              </div>
              <span className="text-xs font-mono text-muted shrink-0 tracking-tight">
                {item.date}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Companies */}
      <section>
        <h2 className="font-display text-2xl mb-5 tracking-tight">Companies</h2>
        <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
          {companies.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-4 px-4 py-3.5"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white border border-border ring-1 ring-black/[0.02] p-1.5">
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
              <p className="flex-1 text-sm font-medium tracking-tight">
                {item.name}
              </p>
              <span className="text-xs font-mono text-muted shrink-0 tracking-tight">
                {item.date}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
