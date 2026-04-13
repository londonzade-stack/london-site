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
        <h1 className="text-3xl font-bold tracking-tight mb-4">Blog</h1>
        <p className="text-muted">Posts coming soon.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-8">Blog</h1>
      <div className="space-y-1">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="flex items-baseline justify-between gap-4 py-3 border-b border-border group"
          >
            <span className="font-medium text-sm group-hover:text-muted transition-colors">
              {post.title}
            </span>
            <span className="text-sm text-muted shrink-0">{post.date}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
