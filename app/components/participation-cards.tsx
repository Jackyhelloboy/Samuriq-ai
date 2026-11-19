import { ArrowUpRight, Users, MessageCircle, Ticket } from "lucide-react";

const cards = [
  { title: "Project alerts", description: "Opt in to WhatsApp invitations for upcoming projects.", href: "/workspace/hiring", icon: MessageCircle },
  { title: "Vendor registration", description: "Register your interest in coordinating a team for client projects.", href: "/workspace/hiring?interest=vendor", icon: Users },
  { title: "Team invitations", description: "Have a team code? Enter it to find and join your assigned team.", href: "/join", icon: Ticket },
];

export function ParticipationCards() {
  return (
    <nav className="participation-cards" aria-label="Project enrollment and updates">
      {cards.map(({ title, description, href, icon: Icon }) => (
        <a href={href} key={href}>
          <span className="participation-icon"><Icon size={22} aria-hidden="true" /></span>
          <strong>{title}</strong>
          <span className="participation-description">{description}</span>
          <ArrowUpRight className="participation-arrow" size={18} aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
