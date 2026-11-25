import {
  ArrowUpRight,
  AudioLines,
  Layers3,
  Move3d,
  ScanEye,
  MapPin,
  Users, Languages, MonitorSmartphone, CalendarDays,
} from "lucide-react";
import { projectState, stateLabel } from "../project-state";
type Job = {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  pair: number;
  rate: string;
  active: number;
  targetStart: string;
  deadline: string;
  onboardingRequired?: number;
  languages: string;
  devices: string;
  visibility?: string;
  enrollmentOnly?:number;
};
export function ProjectCard({
  job: j,
  source = "direct",
}: {
  job: Job;
  source?: string;
}) {
  const Icon = j.category.includes("Speech")
      ? AudioLines
      : j.category.includes("motion")
        ? Move3d
        : j.category.includes("evaluation")
          ? ScanEye
          : Layers3,
    state = projectState(j);
  return (
    <article className={"opportunity-card "+(state==="online"?"project-open":"project-closed")} id={"project-" + j.id}>
      <div className="project-card-top">
        <span className="project-glyph">
          <Icon size={26} strokeWidth={1.4} />
        </span>

        <span className={"badge " + (state === "online" ? "approved" : "")}>
          {j.visibility==="paused"?"Temporarily paused":state==="online"?"Applications open":stateLabel(state)}
        </span>
      </div>
      <p className="card-discipline">{j.category}</p>
      <h2>{j.title}</h2>
      <p className="card-excerpt">{j.description}</p>
      <div className="card-facts">
        <span>
          <MapPin size={13} />
          {j.location}
        </span>
        <span>
          <Users size={13} />
          {j.pair ? "Pair work" : "Individual"}
        </span>
        <span><Languages size={15} aria-hidden="true"/><span>Language: {j.languages || "See project requirements"}</span></span>
        <span><MonitorSmartphone size={15} aria-hidden="true"/><span>Device: {j.devices || "See project requirements"}</span></span>{j.deadline && <span><CalendarDays size={15} aria-hidden="true"/><span>Deadline: {j.deadline}</span></span>}
      </div>
      <div className="card-compensation"><span className="card-discipline">Project rate</span><div>{j.rate || "See the project brief for compensation"}</div></div>

      <a
        href={
          "/projects/detail?id=" +
          encodeURIComponent(j.id) +
          "&source=" +
          encodeURIComponent(source)
        }
        className="card-apply"
      >
        {state==="online"?"View project & requirements":"View project details"} <ArrowUpRight size={18} />
      </a>
    </article>
  );
}
