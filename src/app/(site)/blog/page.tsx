import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata = {
  title: "Blog — London Zade",
  description: "Thoughts on flying, building, and everything in between.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div>
      <header className="page-head">
        <h1 className="page-title">Blog</h1>
        <p className="page-sub">Thoughts on flying, building, and everything in between.</p>
      </header>
      {posts.length === 0 ? (
        <p className="page-sub">Posts coming soon.</p>
      ) : (
        <ul className="panel glass-surface">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="list-row">
                <span className="list-row-main">
                  <span className="list-row-title">{post.title}</span>
                  {post.description && (
                    <span className="list-row-desc">{post.description}</span>
                  )}
                </span>
                <span className="list-row-arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
