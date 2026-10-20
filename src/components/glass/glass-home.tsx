import Image from "next/image";
import Link from "next/link";
import { apps } from "@/data/apps";
import { companies, experience } from "@/data/experience";
import { socials } from "@/data/socials";
import type { PostMeta } from "@/lib/posts";
import { GlassStage } from "./glass-stage";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Entries still holding template values (e.g. YOUR_TWITTER) aren't linked. */
const isPlaceholder = (href: string) => href.includes("YOUR_");

function ShardHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="shard-head">
      <h2 className="shard-title">{title}</h2>
      {children && <span className="shard-meta">{children}</span>}
    </header>
  );
}

export function GlassHome({ posts }: { posts: PostMeta[] }) {
  const year = new Date().getFullYear();

  return (
    <GlassStage>
      {/* Glass nav bar */}
      <nav data-shard="nav" className="shard shard--nav" aria-label="Primary">
        <Link href="/" className="gnav-mark" aria-label="London Zade — home">
          <span className="gnav-dot" aria-hidden="true" />
          London Zade
        </Link>
        <div className="gnav-links">
          <Link href="/" aria-current="page">
            Home
          </Link>
          <Link href="/blog">Blog</Link>
          <Link href="/apps">ZADE</Link>
        </div>
        <span className="gnav-meta">Pilot &middot; Builder</span>
      </nav>

      <main className="glass-main">
        {/* Bio — the big pane */}
        <section data-shard="bio" className="shard shard--bio" aria-labelledby="bio-name">
          <div className="bio-main">
            <p className="bio-kicker">
              Corporate pilot for{" "}
              <a href="https://www.flyslate.com/" {...external}>
                Slate Aviation
              </a>
            </p>
            <h1 id="bio-name" className="bio-name">
              London
              <br />
              Zade.
            </h1>
            <p className="bio-text">
              Pilot, entrepreneur, and builder. I fly jets, former wrencher on
              fighters in the Air National Guard, I build companies and apps on
              the side. Always chasing the next thing worth building.
            </p>
            <div className="bio-cta">
              <Link href="/apps" className="btn-solid">
                Open ZADE
              </Link>
              <Link href="/blog" className="btn-link">
                Read the blog <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
          <footer className="bio-foot">
            <span>&copy; {year} London Zade</span>
            <span>londonzade.com</span>
          </footer>
        </section>

        {/* Experience */}
        <section data-shard="jobs" className="shard shard--list" aria-label="Experience">
          <ShardHead title="Experience">{experience.length} roles</ShardHead>
          <ul className="rows">
            {experience.map((item) => (
              <li key={`${item.company}-${item.date}`}>
                <a href={item.href} className="row" {...external}>
                  <span className="row-logo">
                    <Image src={item.logo} alt="" width={40} height={40} />
                  </span>
                  <span className="row-main">
                    <span className="row-title">{item.title}</span>
                    <span className="row-sub">{item.company}</span>
                  </span>
                  <span className="row-date">{item.date}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Apps → ZADE */}
        <section data-shard="apps" className="shard shard--list" aria-label="ZADE apps">
          <ShardHead title="ZADE">
            <span>{apps.length} apps</span>
            <Link href="/apps">
              View all <span aria-hidden="true">&rarr;</span>
            </Link>
          </ShardHead>
          <ul className="app-grid">
            {apps.map((app) => (
              <li key={app.name}>
                <a href={app.href} className="app" title={app.description} {...external}>
                  <span className="app-name">{app.name}</span>
                  <span className="app-arrow" aria-hidden="true">
                    &#8599;
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Blog */}
        <section data-shard="blog" className="shard shard--list" aria-label="Blog">
          <ShardHead title="Blog">
            <Link href="/blog">
              All posts <span aria-hidden="true">&rarr;</span>
            </Link>
          </ShardHead>
          {posts.length === 0 ? (
            <p className="empty">Posts coming soon.</p>
          ) : (
            <ul className="posts">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="post">
                    <span className="post-title">{post.title}</span>
                    {post.description && (
                      <span className="post-desc">{post.description}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Companies */}
        <section data-shard="companies" className="shard shard--list" aria-label="Companies">
          <ShardHead title="Companies" />
          <ul className="cos">
            {companies.map((item) => (
              <li key={item.name} className="co">
                <span className="co-logo">
                  {item.logo ? (
                    <Image src={item.logo} alt="" width={88} height={88} />
                  ) : (
                    <span className="co-initials">
                      {item.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                  )}
                </span>
                <span className="co-main">
                  <span className="co-name">{item.name}</span>
                  <span className="co-date">{item.date}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Socials */}
        <section data-shard="socials" className="shard shard--list" aria-label="Socials">
          <ShardHead title="Socials" />
          <ul className="social-list">
            {socials.map(({ label, href }) => (
              <li key={label}>
                {isPlaceholder(href) ? (
                  <span className="social social--soon">
                    <span>{label}</span>
                    <span className="social-soon">Soon</span>
                  </span>
                ) : (
                  <a
                    href={href}
                    className="social"
                    {...(href.startsWith("mailto:") ? {} : external)}
                  >
                    <span>{label}</span>
                    <span className="social-arrow" aria-hidden="true">
                      &#8599;
                    </span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </GlassStage>
  );
}
