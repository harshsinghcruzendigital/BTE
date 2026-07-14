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
  { label: 'Solutions', href: '/solutions' },
  { label: 'Process', href: '/process' },
  { label: 'Impact', href: '/impact' },
  { label: 'Projects', href: '/projects' },
  { label: 'Contact', href: '/contact' },
];

export const stats = [
  { value: '8+', label: 'Years of Experience', icon: Sparkles },
  { value: '50+', label: 'Projects Completed', icon: Wrench },
  { value: '120K+', label: 'Tons of Waste Processed', icon: PackageCheck },
  { value: '95%', label: 'Customer Satisfaction', icon: BadgeCheck },
];

export const solutions = [
  {
    title: 'Biomass Power Plants',
    description: 'High-efficiency biomass power plants for reliable and renewable energy.',
    icon: Leaf,
  },
  {
    title: 'Waste to Energy',
    description: 'Converting agricultural and industrial waste into clean energy.',
    icon: Recycle,
  },
  {
    title: 'Biogas Solutions',
    description: 'Advanced biogas systems for industry, communities and agriculture.',
    icon: Droplets,
  },
  {
    title: 'Biochar Production',
    description: 'Turning biomass into biochar for soil health and carbon capture.',
    icon: Sprout,
  },
  {
    title: 'Energy Consulting',
    description: 'Expert consulting for feasibility, design and project implementation.',
    icon: CircleGauge,
  },
  {
    title: 'Operation & Maintenance',
    description: 'Reliable operational performance and long-term plant care.',
    icon: Settings,
  },
];

export const processSteps = [
  {
    title: 'Feedstock Collection',
    description: 'We source biomass waste from agriculture, industries and forestry.',
    icon: Trash2,
  },
  {
    title: 'Processing',
    description: 'The biomass is sorted, dried and processed to ensure maximum efficiency.',
    icon: Factory,
  },
  {
    title: 'Conversion',
    description: 'Advanced technology converts biomass into clean, usable energy.',
    icon: Recycle,
  },
  {
    title: 'Energy Generation',
    description: 'Reliable renewable energy is generated for industries and communities.',
    icon: Zap,
  },
  {
    title: 'By-Products',
    description: 'Valuable by-products such as biochar and organic fertilizer are produced.',
    icon: PackageCheck,
  },
];

export const projects = [
  {
    title: '6 MW Biomass Power Plant',
    location: 'Punjab, India',
    capacity: '6 MW Capacity',
    category: 'Biomass Power',
    image: '/assets/biomass-process.jpg',
    imagePosition: '50% 50%',
  },
  {
    title: 'Waste to Energy Plant',
    location: 'Maharashtra, India',
    capacity: '15 TPD Capacity',
    category: 'Waste to Energy',
    image: '/assets/project-waste-to-energy.jpg',
    imagePosition: '50% 58%',
  },
  {
    title: 'Community Biogas Plant',
    location: 'Gujarat, India',
    capacity: '500 m3/day',
    category: 'Biogas',
    image: '/assets/project-biogas.jpg',
    imagePosition: '50% 55%',
  },
  {
    title: 'Biomass Recovery Plant',
    location: 'Karnataka, India',
    capacity: '10 MW Capacity',
    category: 'Biomass Power',
    image: '/assets/hero-bioenergy.jpg',
    imagePosition: '72% 57%',
  },
  {
    title: 'Industrial Waste to Energy',
    location: 'Tamil Nadu, India',
    capacity: '20 TPD Capacity',
    category: 'Waste to Energy',
    image: '/assets/project-biochar.jpg',
    imagePosition: '50% 54%',
  },
  {
    title: 'Large-Scale Biogas Plant',
    location: 'Uttar Pradesh, India',
    capacity: '750 m3/day',
    category: 'Biogas',
    image: '/assets/project-biogas.jpg',
    imagePosition: '78% 55%',
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
  { label: 'Phone', value: '+91 98765 43210', href: 'tel:+919876543210', icon: Building2 },
  { label: 'Email', value: 'info@biotrendenergy.com', href: 'mailto:info@biotrendenergy.com', icon: BriefcaseBusiness },
  { label: 'Office', value: 'Gurugram, Haryana, India', href: '#contact', icon: Flame },
];
