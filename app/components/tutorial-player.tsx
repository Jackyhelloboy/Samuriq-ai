"use client";
import { useEffect, useRef, useState } from "react";
import { startTutorial, recordPlayback } from "../onboarding-actions";
import { embedUrl } from "../project-state";
export default function TutorialPlayer({
  projectId,
  url,
  seconds,
  initialWatched,
  mode,
}: {
  projectId: string;
  url: string;
  seconds: number;
  initialWatched: number;
  mode: string;
}) {
  const [watched, setWatched] = useState(initialWatched),
    [message, setMessage] = useState(""),
    [ready, setReady] = useState(false);
  const nonce = useRef(""),
    video = useRef<HTMLVideoElement>(null),
    box = useRef<HTMLDivElement>(null),
    furthest = useRef(initialWatched),
    player = useRef<any>(null),
    busy = useRef(false);
  useEffect(() => {
    let active = true;
    startTutorial(projectId)
      .then((r) => {
        if (active) {
          nonce.current = r.nonce;
          setWatched(r.watched);
          setReady(true);
        }
      })
      .catch((e) => setMessage(e.message));
    return () => {
      active = false;
    };
  }, [projectId]);
  useEffect(() => {
    if (!ready || mode === "manual") return;
    const timer = setInterval(async () => {
      if (busy.current || document.hidden) return;
      let position = 0,
        playing = false;
      if (mode === "direct" && video.current) {
        position = video.current.currentTime;
        playing =
          (!video.current.paused && !video.current.ended) ||
          video.current.ended;
      }
      if (mode === "youtube" && player.current?.getCurrentTime) {
        position = player.current.getCurrentTime();
        playing =
          player.current.getPlayerState() === 1 ||
          (player.current.getPlayerState() === 0 && position >= seconds);
      }
      if (!playing) return;
      if (position > furthest.current + 15) {
        if (mode === "direct" && video.current)
          video.current.currentTime = furthest.current;
        else player.current?.seekTo(furthest.current, true);
        return;
      }
      furthest.current = Math.max(furthest.current, position);
      busy.current = true;
      try {
        const r = await recordPlayback(projectId, nonce.current, position);
        setWatched(r.watched);
      } catch (e: any) {
        setMessage(e.message);
      } finally {
        busy.current = false;
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [ready, projectId, mode]);
  useEffect(() => {
    if (mode !== "youtube" || !ready || !box.current) return;
    let destroyed = false;
    const init = () => {
      if (destroyed || !box.current) return;
      const e = embedUrl(url);
      if (!e) return;
      const id = e.split("/").pop();
      player.current = new (window as any).YT.Player(box.current, {
        videoId: id,
        playerVars: { controls: 1, disablekb: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: () =>
            setMessage(
              "Play the tutorial. Forward seeking is restricted during onboarding.",
            ),
        },
      });
    };
    if ((window as any).YT?.Player) init();
    else {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
      const poll = setInterval(() => {
        if ((window as any).YT?.Player) {
          clearInterval(poll);
          init();
        }
      }, 500);
      return () => {
        destroyed = true;
        clearInterval(poll);
        player.current?.destroy?.();
      };
    }
    return () => {
      destroyed = true;
      player.current?.destroy?.();
    };
  }, [mode, ready, url]);
  const e = embedUrl(url);
  return (
    <div className="tutorial-player">
      {mode === "direct" ? (
        <video
          ref={video}
          src={url}
          controls
          controlsList="nodownload noplaybackrate"
          playsInline
          onSeeking={() => {
            if (
              video.current &&
              video.current.currentTime > furthest.current + 2
            )
              video.current.currentTime = furthest.current;
          }}
          onRateChange={() => {
            if (video.current) video.current.playbackRate = 1;
          }}
        />
      ) : mode === "youtube" ? (
        <div className="video-frame">
          <div ref={box} />
        </div>
      ) : e ? (
        <div className="video-frame">
          <iframe src={e} title="Project onboarding tutorial" allowFullScreen />
        </div>
      ) : (
        <a className="button light" target="_blank" rel="noreferrer" href={url}>
          Open tutorial video ↗
        </a>
      )}
      {mode === "manual" ? (
        <p>
          This video provider needs coordinator verification. Watch the full
          tutorial and ask your coordinator to verify completion.
        </p>
      ) : (
        <>
          <progress max={seconds} value={watched} />
          <p>
            {Math.min(watched, seconds)} / {seconds} seconds recorded.{" "}
            {watched >= seconds
              ? "Tutorial complete. Refresh to continue to terms."
              : "Keep this page visible while the video plays."}
          </p>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {watched >= seconds && (
        <a
          className="button dark"
          href={"/projects/onboarding?id=" + encodeURIComponent(projectId)}
        >
          Continue to terms →
        </a>
      )}
      <p className="muted">
        Playback progress records elapsed viewing, not attention or activity on
        the client platform.
      </p>
    </div>
  );
}
