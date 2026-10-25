import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { HomeEffects } from "@/components/home/home-effects";
import { APPS_LINKED, apps } from "@/data/apps";
import { companies, experience } from "@/data/experience";
import { socials } from "@/data/socials";
import { pageMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/metadata";
import { getAllPosts } from "@/lib/posts";
import "./home.css";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;
const years = (d: string) => d.replace("–Present", " — Now").replace("–", " — ");

// The animated share card (scripts/og/render.mjs). Versioned by content, like Next does for og:image,
// so link-preview caches never pair a new poster with an old clip. Only the homepage gets it.
const videoHash = createHash("sha1").update(readFileSync(join(process.cwd(), "public/og/home.mp4"))).digest("hex").slice(0, 10);
export const metadata = pageMetadata({ title: SITE_NAME, description: SITE_DESCRIPTION, path: "/", video: `/og/home.mp4?v=${videoHash}` });

export default function Home() {
  const posts = getAllPosts();
  const year = new Date().getFullYear();

  return (
    <div className="tb">
      <HomeEffects />

      <header className="tb-nav">
        <div className="wrap nav-in">
          <a className="mark" href="#top">
            <span className="node" aria-hidden="true" />
            London Zade
          </a>
          <nav className="nav-links" aria-label="Sections">
            <a href="#work">Work</a>
            <a href="#zade">ZADE</a>
            <a href="#writing">Writing</a>
            <a href="#contact">Contact</a>
          </nav>
          <a className="nav-cta" href="#zade">
            See what I&apos;m building
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-label="Intro">
          <div className="hero-art" aria-hidden="true">
            <div id="tb-glyphs" />
            <div id="tb-spine" />
            <div id="tb-jet" />
            <div className="hero-labels">
              <div className="callout" id="tb-c1">
                <span className="box" />
                <span className="node" />
                <span className="txt">
                  <span className="t1">First Officer</span>
                  <span className="t2">SLATE AVIATION · 2025–NOW</span>
                </span>
              </div>
              <div className="callout" id="tb-c2">
                <span className="box" />
                <span className="node" />
                <span className="txt">
                  <span className="t1">Crew Chief</span>
                  <span className="t2">AIR NATIONAL GUARD · 2020–2026</span>
                </span>
              </div>
              <div className="callout" id="tb-c3">
                <span className="box" />
                <span className="node" />
                <span className="txt">
                  <span className="t1">Founder</span>
                  <span className="t2">ZADE · {apps.length} APPS</span>
                </span>
              </div>
            </div>
          </div>
          <div className="wrap" style={{ width: "100%" }}>
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="node" aria-hidden="true" />
                Corporate pilot · Founder · Builder
              </div>
              <h1>
                Flying jets <span className="soft">and</span> building stuff.
              </h1>
              <p className="lede">
                Pilot, entrepreneur, and builder. I fly jets, former wrencher on fighters in the Air
                National Guard, I build companies and apps on the side. Always chasing the next thing
                worth building.
              </p>
              <div className="hero-cta">
                <a className="btn btn-white" href="#zade">
                  Explore ZADE
                </a>
                <Link className="btn btn-line" href="/blog">
                  Read the blog
                </Link>
              </div>
            </div>
          </div>
          <div className="scroll-cue" aria-hidden="true">
            <span>Scroll</span>
            <i />
          </div>
        </section>

        <section className="block" aria-labelledby="now-t">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="sec-label">
                <span className="node" aria-hidden="true" />
                Now
              </div>
              <h2 className="sec-title" id="now-t">
                In the right seat, <span className="soft">and building on the side.</span>
              </h2>
            </div>
            <div className="now reveal">
              <div>
                <div className="mini" id="tb-now-1" aria-hidden="true" />
                <span className="k">
                  <span className="node" aria-hidden="true" />
                  Flying
                </span>
                <span className="v">
                  First Officer at{" "}
                  <a href="https://www.flyslate.com/" {...external}>
                    Slate Aviation
                  </a>
                </span>
                <span className="s">Corporate jets · since 2025</span>
              </div>
              <div>
                <div className="mini" id="tb-now-2" aria-hidden="true" />
                <span className="k">
                  <span className="node" aria-hidden="true" />
                  Building
                </span>
                <span className="v">{apps.length} apps under ZADE</span>
                <span className="s">Aviation, AI, and everyday tools</span>
              </div>
              <div>
                <div className="mini" id="tb-now-3" aria-hidden="true" />
                <span className="k">
                  <span className="node" aria-hidden="true" />
                  Running
                </span>
                <span className="v">ZADE OPS &amp; ZADE AVIATION</span>
                <span className="s">Two companies · since 2024</span>
              </div>
            </div>
          </div>
        </section>

        <section className="block" id="work" aria-labelledby="work-t">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="sec-label">
                <span className="node" aria-hidden="true" />
                Experience
              </div>
              <h2 className="sec-title" id="work-t">
                From the flight line <span className="soft">to the flight deck.</span>
              </h2>
            </div>
            <div className="route">
              <div className="route-line" aria-hidden="true">
                <i />
              </div>
              {experience.map((item) => (
                <a key={`${item.company}-${item.date}`} className="stop reveal" href={item.href} {...external}>
                  <span className="yr">{years(item.date)}</span>
                  <span className="dot" aria-hidden="true" />
                  <span className="mid">
                    <span className="role">{item.title}</span> <span className="org">· {item.company}</span>
                  </span>
                  <span className="go" aria-hidden="true">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="block" id="zade" aria-labelledby="zade-t">
          <div className="wrap">
            <div className="zade-top">
              <div id="tb-laptop" aria-hidden="true" />
              <div className="sec-head reveal">
                <div className="sec-label">
                  <span className="node" aria-hidden="true" />
                  ZADE
                </div>
                <h2 className="sec-title" id="zade-t">
                  {apps.length} products, <span className="soft">shipped and counting.</span>
                </h2>
              </div>
            </div>
            <div className="apps reveal">
              {apps.map((app, i) => {
                const className = `app${i < 4 ? " new" : ""}`;
                const body = (
                  <>
                    <span className="n">{app.name}</span>
                    <span className="d">{app.description}</span>
                    {APPS_LINKED && (
                      <span className="a" aria-hidden="true">
                        ↗
                      </span>
                    )}
                  </>
                );
                return APPS_LINKED ? (
                  <a key={app.name} className={className} href={app.href} title={app.description} {...external}>
                    {body}
                  </a>
                ) : (
                  <div key={app.name} className={className} title={app.description}>
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="block" aria-labelledby="cos-t">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="sec-label">
                <span className="node" aria-hidden="true" />
                Companies
              </div>
              <h2 className="sec-title" id="cos-t">
                The companies <span className="soft">behind the work.</span>
              </h2>
            </div>
            <div className="cos reveal">
              {companies.map((c, i) => (
                <div key={c.name} className="co">
                  <div className="art" id={`tb-co-${i + 1}`} aria-hidden="true" />
                  <span className="nm">{c.name}</span>
                  <span className="dt">{years(c.date).toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="block" id="writing" aria-labelledby="writing-t">
          <div className="wrap">
            <div className="sec-head reveal">
              <div className="sec-label">
                <span className="node" aria-hidden="true" />
                Writing
              </div>
              <h2 className="sec-title" id="writing-t">
                Notes from <span className="soft">the cockpit and the build.</span>
              </h2>
            </div>
            <div className="posts reveal">
              {posts.map((post) => (
                <Link key={post.slug} className="post" href={`/blog/${post.slug}`}>
                  <span className="k">
                    <span className="node" aria-hidden="true" />
                    Blog
                  </span>
                  <h3>{post.title}</h3>
                  {post.description && <p>{post.description}</p>}
                  <span className="r">Read →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="contact" id="contact" aria-labelledby="contact-t">
          <div id="tb-footer-glyphs" aria-hidden="true" />
          <div className="wrap">
            <h2 id="contact-t">
              Let&apos;s build <span className="soft">something worth building.</span>
            </h2>
            <div className="socials">
              {socials.map(({ label, handle, href }) => (
                <a
                  key={label}
                  href={href}
                  {...(href.startsWith("mailto:") ? {} : external)}
                  aria-label={`${label}: ${handle}`}
                >
                  {label} <small>{handle}</small>
                  <i aria-hidden="true">↗</i>
                </a>
              ))}
            </div>
            <div className="foot">
              <span>&copy; {year} London Zade</span>
              <span>
                <Link href="/blog">Blog</Link> &nbsp;·&nbsp; <Link href="/apps">ZADE</Link>
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
