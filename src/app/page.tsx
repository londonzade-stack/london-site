import { GlassHome } from "@/components/glass/glass-home";
import { getAllPosts } from "@/lib/posts";

export default function Home() {
  return <GlassHome posts={getAllPosts()} />;
}
