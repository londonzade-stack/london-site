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
      <div>
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block py-4 border-b border-neutral-200 first:border-t transition-colors hover:opacity-70"
          >
            <p className="text-sm font-medium">{post.title}</p>
            {post.description && (
              <p className="text-sm text-muted mt-0.5">{post.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
