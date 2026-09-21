import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { MDXContent } from "@/components/mdx-content";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.meta.title} — London Zade`,
    description: post.meta.description,
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article>
      <header className="mb-10">
        <Link
          href="/blog"
          className="label inline-flex items-center gap-2 mb-4 hover:text-foreground transition-colors"
        >
          <span className="text-accent">&larr;</span> Log
        </Link>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight leading-[1]">
          {post.meta.title}
        </h1>
        {post.meta.date && (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted mt-4">
            {post.meta.date}
          </p>
        )}
        <div className="mt-6 h-px w-full bg-border" />
      </header>
      <div className="prose">
        <MDXContent source={post.content} />
      </div>
    </article>
  );
}
