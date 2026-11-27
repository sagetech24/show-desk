"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { toState, UserError, type ActionState } from "@/lib/errors";
import { snapshotImage, syncPosts } from "@/lib/instagram";

const IMAGE_RE = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export async function syncPostsAction(): Promise<ActionState> {
  try {
    await assertAdmin();
    const r = await syncPosts();
    revalidatePath("/posts");
    revalidatePath("/", "layout");
    if (r.mode === "sample")
      return { ok: r.added ? `Sample mode: added ${r.added} sample posts.` : "Sample mode: no more sample posts to add." };
    return { ok: `Synced from Instagram: ${r.added} new, ${r.refreshed} already known.` };
  } catch (e) {
    return toState(e);
  }
}

export async function addManualPostAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const permalink = String(form.get("permalink") ?? "").trim();
    if (permalink) {
      let u: URL;
      try {
        u = new URL(permalink);
      } catch {
        throw new UserError("That doesn't look like a link.");
      }
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new UserError("The link must start with https://");
    }
    const caption = String(form.get("caption") ?? "").trim().slice(0, 4000);
    const image = String(form.get("image") ?? "");
    const imageUrl = String(form.get("image_url") ?? "").trim();
    let media = "";
    if (image) {
      if (!IMAGE_RE.test(image) || image.length > 2_000_000) throw new UserError("That photo couldn't be used. Try a JPG or PNG.");
      media = image;
    } else if (imageUrl) {
      if (!/^https:\/\//i.test(imageUrl)) throw new UserError("The image link must start with https://");
      media = imageUrl;
    }
    if (!permalink && !caption && !media) throw new UserError("Add a link, a caption or a photo.");
    await sql(
      "insert into ig_posts (caption, media_url, permalink, posted_at, source) values ($1,$2,$3, now(), 'manual')",
      [caption, media, permalink],
    );
    revalidatePath("/posts");
    revalidatePath("/", "layout");
    return { ok: "Post added to the inbox." };
  } catch (e) {
    return toState(e);
  }
}

export async function setPostStatusAction(postId: number, status: "new" | "dismissed"): Promise<ActionState> {
  try {
    await assertAdmin();
    await sql("update ig_posts set status = $2, product_id = null where id = $1", [Number(postId), status]);
    revalidatePath("/posts");
    revalidatePath("/", "layout");
    return { ok: "Updated" };
  } catch (e) {
    return toState(e);
  }
}

export async function attachPostAction(postId: number, productId: number, useImage: boolean): Promise<ActionState> {
  try {
    await assertAdmin();
    const post = (await sql<{ media_url: string }>("select media_url from ig_posts where id = $1", [Number(postId)]))[0];
    if (!post) throw new UserError("Post not found.");
    const prod = await sql<{ id: number; image: string | null }>("select id, image from products where id = $1", [Number(productId)]);
    if (!prod[0]) throw new UserError("Choose a product.");
    await sql("update ig_posts set status='linked', product_id=$2 where id=$1", [Number(postId), Number(productId)]);
    if (useImage && post.media_url) {
      const snap = await snapshotImage(post.media_url);
      if (snap) await sql("update products set image=$2, image_version=image_version+1 where id=$1", [Number(productId), snap]);
    }
    revalidatePath("/posts");
    revalidatePath("/", "layout");
    return { ok: "Attached." };
  } catch (e) {
    return toState(e);
  }
}
