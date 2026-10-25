import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { ogContentType, ogSize, renderOgCard } from "@/lib/og";

export const alt = "Blog post by London Zade";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  return renderOgCard({
    eyebrow: "Blog",
    title: post?.meta.title ?? "Blog",
    description: post?.meta.description,
    path: `/blog/${slug}`,
  });
}
