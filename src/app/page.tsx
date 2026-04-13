import Image from "next/image";
import { socials } from "@/data/socials";
import { experience, companies } from "@/data/experience";

export default function Home() {
  return (
    <div>
      {/* Intro */}
      <section className="mb-16">
        <h1 className="text-3xl font-bold tracking-tight mb-1">London Zade</h1>
        <p className="text-muted mb-4">
          Corporate pilot for{" "}
          <a
            href="https://www.flyslate.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Slate Aviation
          </a>
        </p>
        <p className="text-muted leading-relaxed max-w-lg">
          Pilot, entrepreneur, and builder. I fly jets, former wrencher on
          fighters in the Air National Guard, I build companies and apps on the
          side. Always chasing the next thing worth building.
        </p>
        <div className="mt-5 flex flex-wrap gap-4">
          {socials.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              {label} &rarr;
            </a>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section className="mb-16">
        <h2 className="text-lg font-semibold mb-4">Experience</h2>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 overflow-hidden divide-y divide-neutral-200">
          {experience.map((item) => (
            <a
              key={`${item.company}-${item.date}`}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-neutral-100/80"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white border border-neutral-200">
                <Image
                  src={item.logo}
                  alt={item.company}
                  width={36}
                  height={36}
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {item.title}
                </p>
                <p className="text-sm text-muted">{item.company}</p>
              </div>
              <span className="text-xs text-muted shrink-0">{item.date}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Companies */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Companies</h2>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 overflow-hidden divide-y divide-neutral-200">
          {companies.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-4 px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white border border-neutral-200">
                {item.logo ? (
                  <Image
                    src={item.logo}
                    alt={item.name}
                    width={36}
                    height={36}
                    className="h-7 w-7 object-contain"
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
              <p className="flex-1 text-sm font-medium">{item.name}</p>
              <span className="text-xs text-muted shrink-0">{item.date}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
