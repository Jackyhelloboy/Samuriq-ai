"use client";
import { useState } from "react";
import { postFields, type PublicPost } from "../admin/projects/post/fields";

const sample: PublicPost = {
  title: "Record everyday conversations",
  category: "Speech & audio",
  location: "Remote",
  description: "Record short conversations with a partner in a quiet room.",
  requirements: "A microphone, a quiet room and a partner.",
};

export default function Demo() {
  const [post, setPost] = useState(sample);
  const [saved, setSaved] = useState(false);
  return <main className="demo-workspace">
    <nav><a href="/">Samuriq AI</a><a href="/login">Exit demo</a></nav>
    <h1>Demo project editor</h1>
    <p>Changes appear in the preview and reset when you leave this page.</p>
    <div className="demo-panels">
      <form onSubmit={event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const values = { ...post };
        for (const {name} of postFields) values[name] = String(form.get(name) ?? "").trim();
        if (!values.title || !values.description) return;
        setPost(values);
        setSaved(true);
      }}>
        {postFields.map(({name, label, limit}) => <label key={name}>{label}
          <textarea name={name} maxLength={limit} required={name === "title" || name === "description"} rows={name === "description" || name === "requirements" ? 3 : 1} defaultValue={sample[name]} />
        </label>)}
        <button className="button dark">Save demo post</button>
        {saved && <p role="status">Preview updated.</p>}
      </form>
      <article aria-label="Project preview"><img src="/images/collaboration.jpg" alt="" />
        <div><small>{post.category} · {post.location}</small><h2>{post.title}</h2>
        <p>{post.description}</p><h3>Requirements</h3><p>{post.requirements}</p></div>
      </article>
    </div>
  </main>;
}
