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
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-[1.05]">
          {post.meta.title}
        </h1>
        {post.meta.date && (
          <p className="text-sm text-muted mt-3 font-mono tracking-tight">
            {post.meta.date}
          </p>
        )}
      </header>
      <div className="prose">
        <MDXContent source={post.content} />
      </div>
    </article>
  );
}
