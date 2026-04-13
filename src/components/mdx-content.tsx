import { remark } from "remark";
import html from "remark-html";

interface Props {
  source: string;
}

export async function MDXContent({ source }: Props) {
  const result = await remark().use(html).process(source);
  return <div dangerouslySetInnerHTML={{ __html: result.toString() }} />;
}
