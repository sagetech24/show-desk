import { ProductForm } from "@/components/ProductForm";
import { listCategories } from "@/lib/categories";
import { sql } from "@/lib/db";
import { guessFromCaption } from "@/lib/ig-parse";
import { STANDARD_SIZES } from "@/lib/config";
import type { IgPost } from "@/lib/types";

export const metadata = { title: "New product" };

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ post?: string }> }) {
  const sp = await searchParams;
  const post = sp.post
    ? (await sql<IgPost>("select * from ig_posts where id = $1", [Number(sp.post)]))[0]
    : undefined;
  const guess = post ? guessFromCaption(post.caption) : undefined;
  const categories = await listCategories();
  // Pre-select what the caption suggests, otherwise the first category.
  const guessed = categories.filter((c) => guess?.categories.includes(c.slug));
  const selected = guessed.length ? guessed : categories.slice(0, 1);
  const imgSrc = post?.media_url ? (post.media_url.startsWith("data:") ? `/api/img/post/${post.id}` : post.media_url) : "";
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="page-title">{post ? "Create product from post" : "Add product"}</h1>
      <ProductForm
        categories={categories}
        initial={{
          categoryIds: selected.map((c) => c.id),
          brand: guess?.brand ?? "",
          name: guess?.name ?? "",
          description: "",
          price: guess?.price ?? 0,
          cost: 0,
          low_stock_threshold: 2,
          variants: STANDARD_SIZES.map((size) => ({ size, stock: 0, reserved: 0 })),
        }}
        post={post ? { id: post.id, image: imgSrc, hasImportableImage: !!post.media_url } : undefined}
      />
    </div>
  );
}
