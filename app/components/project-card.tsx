import ShareProject from "./share-project";
import {
  ArrowUpRight,
  AudioLines,
  Layers3,
  Move3d,
  ScanEye,
  MapPin,
  Users,
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
  preview?: boolean;
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
    <article className="opportunity-card" id={"project-" + j.id}>
      <div className="project-card-top">
        <span className="project-glyph">
          <Icon size={26} strokeWidth={1.4} />
        </span>
        <span className={"badge " + (state === "online" ? "approved" : "")}>
          {stateLabel(state)}
        </span>
      </div>
      <p className="card-discipline">{j.category}{j.preview&&<span className="preview-label">LAYOUT PREVIEW</span>}</p>
      <h2>{j.title}</h2>
      <p className="card-excerpt">{j.description}</p>
      <div className="card-facts">
        <span>
          <MapPin size={13} />
          {j.location}
        </span>
        <span>
          <Users size={13} />
          {j.pair ? "Permanent pair" : "Individual"}
        </span>
      </div>
      <div className="card-compensation">{j.rate}</div>
      {state==="online"&&!j.preview&&<ShareProject compact path={"/projects/detail?id="+encodeURIComponent(j.id)} title={j.title}/>}
      {state==="online"&&!j.preview?(      <a
        href={
          "/projects/detail?id=" +
          encodeURIComponent(j.id) +
          "&source=" +
          encodeURIComponent(source)
        }
        className="card-apply"
      >
        Select project <ArrowUpRight size={18} />
      </a>):<div className="card-apply card-closed" aria-disabled="true"><span>{j.preview?"Preview only · no applications":"Project closed"}</span><span aria-hidden="true">—</span></div>}
    </article>
  );
}
