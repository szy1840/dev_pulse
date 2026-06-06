import { customAlphabet, nanoid } from "nanoid";

/** Prefixed id helpers so rows are self-describing in logs/db. */
export function newId(prefix: string): string {
  return `${prefix}_${nanoid(20)}`;
}

// Invite codes: human-friendly, unambiguous characters, uppercase.
const inviteAlphabet = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 8);

export function newInviteCode(): string {
  return inviteAlphabet();
}
