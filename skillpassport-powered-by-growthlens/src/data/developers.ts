export interface SocialLink {
  platform: "github" | "linkedin" | "instagram" | "x";
  url: string;
  label: string;
}

export interface Developer {
  id: string;
  name: string;
  role: string;
  eyebrow: string;
  bio: string;
  email: string;
  initials: string;
  accentColor: string;
  iconType: "code" | "layers" | "brain" | "sparkles";
  socials: SocialLink[];
}

export const DEVELOPERS: Developer[] = [
  {
    id: "shubham-pokale",
    name: "Shubham Pokale",
    role: "Lead AI & Architecture",
    eyebrow: "FULL-STACK ARCHITECT",
    bio: "Pioneering private local AI pipelines, ChromaDB vector indexing, and Weibull hazard survival modeling for continuous engineering intelligence.",
    email: "shubham.pokale25@pccoepune.org",
    initials: "SP",
    accentColor: "#DFE968",
    iconType: "code",
    socials: [
      {
        platform: "github",
        url: "https://github.com/shubham392007-sketch",
        label: "Shubham Pokale on GitHub",
      },
      {
        platform: "linkedin",
        url: "https://www.linkedin.com/in/shubham-pokale-94030b37a",
        label: "Shubham Pokale on LinkedIn",
      },
      {
        platform: "instagram",
        url: "https://www.instagram.com/shubhamofficial_2007/",
        label: "Shubham Pokale on Instagram",
      },
      {
        platform: "x",
        url: "https://x.com/SHUBHAM392007",
        label: "Shubham Pokale on X",
      },
    ],
  },
  {
    id: "siddhesh-birewar",
    name: "Siddhesh Birewar",
    role: "GrowthLens Developer",
    eyebrow: "SYSTEMS & BACKEND",
    bio: "Architecting resilient data streams, backend telemetry orchestration, and high-integrity enterprise integration pipelines.",
    email: "siddhesh.birewar25@pccoepune.org",
    initials: "SB",
    accentColor: "#F6BB84",
    iconType: "layers",
    socials: [
      {
        platform: "github",
        url: "https://github.com/Siddhesh-Birewar",
        label: "Siddhesh Birewar on GitHub",
      },
      {
        platform: "linkedin",
        url: "https://www.linkedin.com/in/siddhesh-birewar-20bb3136b/",
        label: "Siddhesh Birewar on LinkedIn",
      },
      {
        platform: "instagram",
        url: "https://www.instagram.com/s_i_d_d_h_e_s_h_1o1?igsi=MW56MndsYTBuY2V2eA%3D%3D",
        label: "Siddhesh Birewar on Instagram",
      },
    ],
  },
  {
    id: "vernit-garg",
    name: "Vernit Garg",
    role: "GrowthLens Developer",
    eyebrow: "MACHINE LEARNING",
    bio: "Engineering longitudinal PyTorch LSTM sequence classification, temporal attention weighting, and verifiable competency extraction.",
    email: "vernit.gerg25@pccoe.org",
    initials: "VG",
    accentColor: "#F6C8D6",
    iconType: "brain",
    socials: [
      {
        platform: "github",
        url: "https://github.com/Vernit185",
        label: "Vernit Garg on GitHub",
      },
      {
        platform: "linkedin",
        url: "https://www.linkedin.com/in/vernit-garg-231539385/",
        label: "Vernit Garg on LinkedIn",
      },
      {
        platform: "instagram",
        url: "https://www.instagram.com/qubec_185/?hl=en",
        label: "Vernit Garg on Instagram",
      },
    ],
  },
  {
    id: "adwait-umredkar",
    name: "Adwait Umredkar",
    role: "GrowthLens Developer",
    eyebrow: "FRONTEND & DESIGN",
    bio: "Crafting editorial Moonwood design tokens, 3D interactive visualizations, and responsive human-centric user experiences.",
    email: "adwait.umredkar25@pccoepune.org",
    initials: "AU",
    accentColor: "#FBF1CF",
    iconType: "sparkles",
    socials: [
      {
        platform: "github",
        url: "https://github.com/adwaitumredkar1818",
        label: "Adwait Umredkar on GitHub",
      },
      {
        platform: "linkedin",
        url: "https://www.linkedin.com/in/adwait-umredkar/",
        label: "Adwait Umredkar on LinkedIn",
      },
      {
        platform: "instagram",
        url: "http://instagram.com/adwaitumredkar/?hl=en",
        label: "Adwait Umredkar on Instagram",
      },
    ],
  },
];
