export interface ExperienceItem {
  company: string;
  title: string;
  date: string;
  logo: string;
}

export const experience: ExperienceItem[] = [
  {
    company: "SLATE",
    title: "First Officer",
    date: "2025–Present",
    logo: "/logos/slate.png",
  },
  {
    company: "Wheels Up",
    title: "First Officer",
    date: "2024",
    logo: "/logos/wheelsup.jpeg",
  },
  {
    company: "ATP Flight School",
    title: "Lead Flight Instructor",
    date: "2023–2024",
    logo: "/logos/atp.jpg",
  },
  {
    company: "Beach Banners",
    title: "Contract Pilot & Flight Instructor",
    date: "2023–2024",
    logo: "/logos/beachbanners.webp",
  },
  {
    company: "Skydive Amelia",
    title: "Jump Pilot",
    date: "2023",
    logo: "/logos/skydiveamelia.webp",
  },
  {
    company: "USAF Air National Guard",
    title: "Crew Chief",
    date: "2020–2026",
    logo: "/logos/usaf.png",
  },
  {
    company: "UPS",
    title: "Revenue Recovery",
    date: "2019–2021",
    logo: "/logos/ups.png",
  },
  {
    company: "AJM Packaging",
    title: "Machine & Equipment Operations",
    date: "2019",
    logo: "/logos/ajm.png",
  },
];

export interface CompanyItem {
  name: string;
  date: string;
}

export const companies: CompanyItem[] = [
  {
    name: "ZADE OPS LLC",
    date: "2025–Present",
  },
  {
    name: "ZADE AVIATION LLC",
    date: "2024–Present",
  },
];
