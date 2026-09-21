import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = {
  title: "Blog — London Zade",
  description: "Thoughts on flying, building, and everything in between.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  if (posts.length === 0) {
    return (
      <div>
        <p className="label mb-3">
          <span className="text-accent">//</span> Log
        </p>
        <h1 className="font-display text-5xl sm:text-6xl font-bold uppercase tracking-tight leading-[0.95] mb-4">
          Blog
        </h1>
        <p className="text-muted">Posts coming soon.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="label mb-3">
            <span className="text-accent">//</span> Log
          </p>
          <h1 className="font-display text-5xl sm:text-6xl font-bold uppercase tracking-tight leading-[0.95]">
            Blog
          </h1>
        </div>
        <span className="font-mono text-[11px] tracking-[0.18em] text-muted pb-1">
          {String(posts.length).padStart(2, "0")} ENTRIES
        </span>
      </div>
      <div className="border-t border-border">
        {posts.map((post, i) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group relative flex items-start gap-4 sm:gap-5 py-5 border-b border-border transition-colors hover:bg-highlight -mx-4 px-4 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-accent before:origin-top before:scale-y-0 before:transition-transform before:duration-200 hover:before:scale-y-100"
          >
            <span className="w-6 shrink-0 pt-0.5 font-mono text-[11px] tracking-[0.14em] text-muted/60 group-hover:text-accent transition-colors">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium tracking-tight">
                {post.title}
              </p>
              {post.description && (
                <p className="text-sm text-muted mt-1">{post.description}</p>
              )}
            </div>
            <span className="shrink-0 pt-0.5 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all">
              &rarr;
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
