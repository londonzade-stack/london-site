import Image from "next/image";
import { socials } from "@/data/socials";
import { experience, companies } from "@/data/experience";

export default function Home() {
  return (
    <div>
      {/* Intro */}
      <section className="mb-16">
        <h1 className="text-3xl font-bold tracking-tight mb-4">London Zade</h1>
        <p className="text-muted leading-relaxed max-w-lg">
          Pilot, entrepreneur, and builder. I fly jets, wrench on fighters in
          the Air National Guard, and build aviation companies and apps on the
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
        <h2 className="text-lg font-semibold mb-6">Experience</h2>
        <div className="space-y-3">
          {experience.map((item) => (
            <div
              key={`${item.company}-${item.date}`}
              className="flex items-center gap-4 rounded-lg border border-neutral-200 px-4 py-3 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                <Image
                  src={item.logo}
                  alt={item.company}
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {item.title}
                </p>
                <p className="text-sm text-muted">{item.company}</p>
              </div>
              <span className="text-xs text-muted shrink-0">{item.date}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Companies */}
      <section>
        <h2 className="text-lg font-semibold mb-6">Companies</h2>
        <div className="space-y-3">
          {companies.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-4 rounded-lg border border-neutral-200 px-4 py-3 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                <span className="text-xs font-semibold text-muted">
                  {item.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                </span>
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
