export type ProjectCategory =
  | "arquitectura"
  | "construccion"
  | "interiorismo"
  | "comercial";

export type ProjectStatus = "construido" | "en-obra" | "proyecto" | "concepto";

export interface GalleryImage {
  src: string;
  caption?: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  category: ProjectCategory;
  location: string;
  year: string;
  area?: string;
  client?: string;
  status: ProjectStatus;
  summary: string;
  description: string[];
  materials?: string[];
  services?: string[];
  coverImage: string;
  gallery: GalleryImage[];
  featured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
}

export interface ValueItem {
  title: string;
  description: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface Stat {
  label: string;
  value: string;
  suffix?: string;
}

export interface CompanyInfo {
  legalName: string;
  tradeName: string;
  ruc: string;
  phones: string[];
  emails: string[];
  instagram: string;
  address: string;
  city: string;
  region: string;
  country: string;
  mapQuery: string;
  /** WhatsApp number in international format, digits only (e.g. "51914457116"). */
  whatsapp?: string;
}

export interface HeroContent {
  kicker: string;
  title: string;
  highlight: string;
  subtitle: string;
}

export interface AboutContent {
  kicker: string;
  intro: string;
  story: string[];
  mission: string;
  vision: string;
  values: ValueItem[];
  team: TeamMember[];
  /** Photo next to the "Quiénes somos" teaser on the homepage. */
  teaserImage?: string;
  /** Photo next to the story text on the /nosotros page. */
  pageImage?: string;
}

export interface SiteSettings {
  company: CompanyInfo;
  hero: HeroContent;
  about: AboutContent;
  services: Service[];
  stats: Stat[];
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type TicketStatus = "disponible" | "reservado" | "vendido";

export type RaffleStatus = "borrador" | "activo" | "cerrado";

export interface RaffleMediaItem {
  url: string;
  type: "image" | "video";
  caption?: string;
}

export interface RafflePrize {
  title: string;
  description?: string;
  image?: string;
}

export interface RaffleConfig {
  title: string;
  subtitle?: string;
  description: string;
  rules: string[];
  prizes: RafflePrize[];
  media: RaffleMediaItem[];
  totalTickets: number;
  ticketPrice: number;
  currency: string;
  /** WhatsApp number in international format, digits only. Falls back to the company's number when empty. */
  whatsapp?: string;
  drawDate?: string;
  status: RaffleStatus;
  updatedAt: string;
}

export interface RaffleTicket {
  number: number;
  status: TicketStatus;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  note?: string;
  updatedAt: string;
}

/** Ticket shape exposed on the public site — no buyer contact details. */
export interface PublicRaffleTicket {
  number: number;
  status: TicketStatus;
}
