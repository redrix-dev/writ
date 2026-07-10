/** Shared domain types. Both the god-hook and the Nexus version use these. */

export interface User {
  id: string;
  name: string;
  /** A hex color for the avatar, so presence churn is visible at a glance. */
  color: string;
  /** Whether this user is currently typing. */
  typing: boolean;
}

export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  color: string;
  text: string;
  at: number;
}
