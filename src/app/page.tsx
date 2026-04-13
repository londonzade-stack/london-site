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
        <div className="space-y-0">
          {experience.map((item) => (
            <div
              key={`${item.company}-${item.date}`}
              className="flex items-start justify-between gap-4 py-3 border-b border-border"
            >
              <div className="flex items-center gap-4 min-w-0">
                {item.logo ? (
                  <Image
                    src={item.logo}
                    alt={item.company}
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-full object-contain bg-neutral-100"
                  />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-medium text-muted">
                    {item.company
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-sm text-muted">{item.company}</p>
                </div>
              </div>
              <span className="text-sm text-muted shrink-0">{item.date}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Companies */}
      <section>
        <h2 className="text-lg font-semibold mb-6">Companies</h2>
        <div className="space-y-0">
          {companies.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-4 py-3 border-b border-border"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-medium text-muted">
                  {item.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <p className="font-medium text-sm">{item.name}</p>
              </div>
              <span className="text-sm text-muted shrink-0">{item.date}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
