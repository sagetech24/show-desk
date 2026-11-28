import { CategoryManager } from "@/components/CategoryManager";
import { listCategoriesWithCounts } from "@/lib/categories";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await listCategoriesWithCounts();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Categories</h1>
        <p className="text-sm text-slate-500">
          A shoe can belong to several categories, and a category holds many shoes.
        </p>
      </div>
      <CategoryManager categories={categories} />
    </div>
  );
}
