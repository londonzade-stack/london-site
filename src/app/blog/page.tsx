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
        <h1 className="font-display text-5xl tracking-tight mb-4 leading-[1]">
          Blog
        </h1>
        <p className="text-muted">Posts coming soon.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-5xl tracking-tight mb-10 leading-[1]">
        Blog
      </h1>
      <div>
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group relative block py-5 border-b border-border first:border-t transition-colors hover:bg-highlight -mx-4 px-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[15px] font-medium tracking-tight">
                  {post.title}
                </p>
                {post.description && (
                  <p className="text-sm text-muted mt-1">{post.description}</p>
                )}
              </div>
              <span className="shrink-0 text-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all">
                &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
