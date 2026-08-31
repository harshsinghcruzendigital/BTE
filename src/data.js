import {
  BadgeCheck,
  BatteryCharging,
  BriefcaseBusiness,
  Building2,
  CircleGauge,
  Droplets,
  Factory,
  Flame,
  Handshake,
  Leaf,
  PackageCheck,
  Recycle,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  Target,
  Trash2,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';

export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about-us' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Services', href: '/services' },
  { label: 'Outreach', href: '/outreach' },
  { label: 'Blog', href: '/blog' },
];

export const stats = [
  { value: 'BTE', label: 'Advanced biomass and waste clean-energy solutions', icon: Sparkles },
  { value: 'GHG', label: 'Solutions aimed at reducing greenhouse-gas emissions', icon: Leaf },
  { value: 'R&D', label: 'Technology, research and innovation', icon: Wrench },
  { value: '360°', label: 'Integrated supply-chain and project support', icon: PackageCheck },
];

export const solutions = [
  {
    title: 'Advanced Biomass Pellets',
    description: 'Biomass-pellet manufacturing and clean-fuel solutions that support the replacement of fossil fuels.',
    icon: Leaf,
  },
  {
    title: 'Waste Clean-Energy Solutions',
    description: 'Advanced biomass and waste clean-energy solutions and innovations designed to reduce GHG emissions.',
    icon: Recycle,
  },
  {
    title: 'Supply & Value Chain',
    description: 'Integrated supply-chain, value-chain and project-scheduling support as part of a complete solutions package.',
    icon: Factory,
  },
  {
    title: 'Manufacturing, Services & Spares',
    description: 'Manufacturing, services and spares coordinated with technology and implementation requirements.',
    icon: Settings,
  },
  {
    title: 'Technology & R&D',
    description: 'Technology, research and development integrated into the company’s clean-energy work.',
    icon: CircleGauge,
  },
  {
    title: 'Training & Stakeholder Support',
    description: 'Training for farmers, prospective stakeholders and partners working across the biomass ecosystem.',
    icon: Users,
  },
];

export const processSteps = [
  {
    title: 'Farmer Training',
    description: 'Training farmers to participate in biomass aggregation and the renewable-energy value chain.',
    icon: Trash2,
  },
  {
    title: 'Stakeholder Engagement',
    description: 'Working with prospective stakeholders and energy enthusiasts in India and around the world.',
    icon: Factory,
  },
  {
    title: 'Partner Development',
    description: 'Building partnerships that support the transition to globally sustainable energy.',
    icon: Recycle,
  },
  {
    title: 'Biomass-Pellet Manufacturing',
    description: 'Undertaking biomass-pellet manufacturing as part of Bio Trend Energy’s renewable-energy activities.',
    icon: Zap,
  },
];

export const projects = [
  {
    title: 'Green Energy Transition',
    description: 'Expanding the use of solid biofuel as a clean and cost-effective solution, by Director Sunil Dhingra, featured in Edition 3 of the PPAC Journal by the Ministry of Petroleum and Natural Gas.',
    location: 'PPAC Journal — Edition 3',
    capacity: 'Read publication',
    category: 'Publication',
    image: '/assets/PRAC JOURNEL.jpg',
    href: '/assets/PRAC JOURNEL.pdf',
  },
  {
    title: 'Agriculture as a Source of Sustainable Energy',
    description: 'How crop residues and agricultural waste can support biofuels, biogas and biochar while opening new income streams for farmers and supporting rural development.',
    location: 'Bio Trend Energy Publication',
    capacity: 'Read publication',
    category: 'Publication',
    image: '/assets/AKSHAY URJA.png',
    href: '/assets/AKSHAY URJA.pdf',
  },
  {
    title: 'Biomass Demand-Supply & Pellet Entrepreneurship',
    description: 'Assessment of the biomass demand-supply value chain and entrepreneurship development for pellet production in selected districts, published by the Skill Council for Green Jobs.',
    location: 'Skill Council for Green Jobs',
    capacity: 'Read report',
    category: 'Report',
    image: '/assets/SKILL-COUNCIL-FINAL-REPORT-01.04.23-_Bareilly-Indore.png',
    href: '/assets/SKILL-COUNCIL-FINAL-REPORT-01.04.23-_Bareilly-Indore.pdf',
  },
  {
    title: '1.2 MW Biomass Gasification Project DPR',
    description: 'A detailed project report for a 1.2 MW grid-connected biomass-gasification power facility proposed for the industrial area of Kangra, Himachal Pradesh.',
    location: 'Kangra, Himachal Pradesh',
    capacity: 'Read DPR',
    category: 'Project Report',
    image: '/assets/DPR-Anagram-Himachal-2.0.png',
    href: '/assets/DPR-Anagram-Himachal-2.0.pdf',
  },
];

export const impacts = [
  { label: 'CO2 Emissions Reduced', value: '250K+', detail: 'Tons Annually', icon: Leaf },
  { label: 'Renewable Energy Generated', value: '180+', detail: 'GWh Annually', icon: Zap },
  { label: 'Waste Processed', value: '120K+', detail: 'Tons Annually', icon: PackageCheck },
  { label: 'Jobs Created', value: '350+', detail: 'Direct & Indirect', icon: Users },
];

export const values = [
  { title: 'Innovation', icon: BatteryCharging },
  { title: 'Responsibility', icon: ShieldCheck },
  { title: 'Partnership', icon: Handshake },
  { title: 'Purpose', icon: Target },
];

export const contactDetails = [
  { label: 'Phone', value: '+91-7678578185', href: 'tel:+917678578185', icon: Building2 },
  { label: 'Email', value: 'info@biotrendenergy.com', href: 'mailto:info@biotrendenergy.com', icon: BriefcaseBusiness },
  { label: 'Company', value: 'Bio Trend Energy Private Limited, India', href: '#contact', icon: Flame },
];
