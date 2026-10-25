export interface Social {
  label: string;
  /** What's shown next to the label (handle, name or address). */
  handle: string;
  href: string;
}

export const socials: Social[] = [
  {
    label: "X",
    handle: "@londonzade__",
    href: "https://x.com/londonzade__",
  },
  {
    label: "Instagram",
    handle: "@london.zade",
    href: "https://www.instagram.com/london.zade/",
  },
  {
    label: "LinkedIn",
    handle: "London Kassab",
    // TODO: swap for the exact profile URL (linkedin.com/in/...) once London sends it.
    href: "https://www.linkedin.com/search/results/people/?keywords=London%20Kassab",
  },
  {
    label: "Email",
    handle: "londonzade@gmail.com",
    href: "mailto:londonzade@gmail.com",
  },
];
