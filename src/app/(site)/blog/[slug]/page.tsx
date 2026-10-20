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
      <header className="page-head">
        <Link href="/blog" className="back-link">
          <span aria-hidden="true">&larr;</span> Blog
        </Link>
        <h1 className="page-title" style={{ fontSize: "clamp(34px, 7vw, 52px)" }}>
          {post.meta.title}
        </h1>
        {post.meta.description && <p className="page-sub">{post.meta.description}</p>}
        {post.meta.date && <p className="page-sub">{post.meta.date}</p>}
      </header>
      <div className="prose">
        <MDXContent source={post.content} />
      </div>
    </article>
  );
}
