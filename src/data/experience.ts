export interface ExperienceItem {
  company: string;
  title: string;
  date: string;
  logo: string;
  href: string;
}

export const experience: ExperienceItem[] = [
  {
    company: "SLATE",
    title: "First Officer",
    date: "2025–Present",
    logo: "/logos/slate.png",
    href: "https://www.flyslate.com/",
  },
  {
    company: "Wheels Up",
    title: "First Officer",
    date: "2024",
    logo: "/logos/wheelsup.jpeg",
    href: "https://www.wheelsup.com/",
  },
  {
    company: "ATP Flight School",
    title: "Lead Flight Instructor",
    date: "2023–2024",
    logo: "/logos/atp.jpg",
    href: "https://www.atpflightschool.com/",
  },
  {
    company: "Beach Banners",
    title: "Contract Pilot & Flight Instructor",
    date: "2023–2024",
    logo: "/logos/beachbanners.webp",
    href: "https://www.beachbanners.com/",
  },
  {
    company: "Skydive Amelia",
    title: "Jump Pilot",
    date: "2023",
    logo: "/logos/skydiveamelia.webp",
    href: "https://www.skydiveameliaisland.com/",
  },
  {
    company: "USAF Air National Guard",
    title: "Crew Chief",
    date: "2020–2026",
    logo: "/logos/usaf.png",
    href: "https://www.goang.com/",
  },
  {
    company: "UPS",
    title: "Revenue Recovery",
    date: "2019–2021",
    logo: "/logos/ups.png",
    href: "https://www.ups.com/",
  },
  {
    company: "AJM Packaging",
    title: "Machine & Equipment Operations",
    date: "2019",
    logo: "/logos/ajm.png",
    href: "https://www.ajmpack.com/",
  },
];

export interface CompanyItem {
  name: string;
  date: string;
  logo?: string;
}

export const companies: CompanyItem[] = [
  {
    name: "ZADE OPS LLC",
    date: "2025–Present",
    logo: "/logos/zadeops.png",
  },
  {
    name: "ZADE AVIATION LLC",
    date: "2024–Present",
  },
];
