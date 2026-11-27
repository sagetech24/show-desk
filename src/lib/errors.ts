export class UserError extends Error {}

export type ActionState = { error?: string; ok?: string } | undefined;

export function toState(e: unknown): ActionState {
  if (e instanceof UserError) return { error: e.message };
  console.error(e);
  return { error: "Something went wrong. Please try again." };
}
