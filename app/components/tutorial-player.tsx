"use client";
import {useRouter} from "next/navigation";
import {tutorialMediaUrl} from "../tutorial-media";
import { useEffect, useRef, useState } from "react";
import { startTutorial, recordPlayback, setVideoDuration } from "../onboarding-actions";
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
  const router=useRouter(),refreshed=useRef(false);
  const [required,setRequired]=useState(seconds),[started,setStarted]=useState(false),[playerReady,setPlayerReady]=useState(false);
  const [watched, setWatched] = useState(initialWatched),
    [message, setMessage] = useState(""),
    [ready, setReady] = useState(false);
  const nonce = useRef(""),
    video = useRef<HTMLVideoElement>(null),
    box = useRef<HTMLDivElement>(null),
    furthest = useRef(initialWatched),
    player = useRef<any>(null),
    busy = useRef(false), durationSent=useRef(false);
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
        position = video.current.ended?Math.ceil(video.current.currentTime):video.current.currentTime;
        playing =
          (!video.current.paused && !video.current.ended) ||
          video.current.ended;
      }
      if (mode === "youtube" && player.current?.getCurrentTime) {
        position = player.current.getPlayerState()===0?Math.ceil(player.current.getCurrentTime()):player.current.getCurrentTime();
        playing =
          player.current.getPlayerState() === 1 ||
          (player.current.getPlayerState() === 0 && position >= seconds);
      }
      if (!playing) return;
      const duration=mode==='direct'?video.current?.duration:player.current?.getDuration?.();
      if(!durationSent.current&&Number.isFinite(duration)&&duration>0){durationSent.current=true;setVideoDuration(projectId,nonce.current,duration).then(r=>setRequired(r.requiredSeconds)).catch(e=>{durationSent.current=false;setMessage(e.message)});}

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
        if(position>r.position+1){furthest.current=r.position;if(mode==="direct"&&video.current)video.current.currentTime=r.position;else player.current?.seekTo(r.position,true);}
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
        playerVars: { controls: 0, disablekb: 1, rel: 0, playsinline: 1 },
        events: {
          onReady:()=>{setPlayerReady(true);setMessage("Play the full tutorial to continue. Skip and speed controls are unavailable.");const d=player.current?.getDuration?.();if(d)setVideoDuration(projectId,nonce.current,d).then(r=>setRequired(r.requiredSeconds)).catch(e=>setMessage(e.message));},
          onPlaybackRateChange:()=>player.current?.setPlaybackRate?.(1),
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
  useEffect(()=>{if(watched>=required&&required>0&&!refreshed.current){refreshed.current=true;router.refresh();}},[watched,required,router]);
  const e = embedUrl(url);
  return (
    <div className="tutorial-player">
      {mode === "direct" ? (
        <video
          ref={video}
          src={tutorialMediaUrl(url)}
          preload="metadata"
          onPause={()=>setStarted(false)}
          onError={()=>{setStarted(false);setMessage("The video could not load. Check your connection and reload this page; recorded progress is saved.")}}
          tabIndex={-1}
          disablePictureInPicture
          onContextMenu={e=>e.preventDefault()}
          onLoadedMetadata={()=>{if(video.current&&initialWatched>0)video.current.currentTime=initialWatched;if(video.current?.duration&&nonce.current)setVideoDuration(projectId,nonce.current,video.current.duration).then(r=>setRequired(r.requiredSeconds)).catch(e=>setMessage(e.message));}}
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
      {mode!=="manual"&&<button className="tutorial-play" disabled={!ready||(mode==="youtube"&&!playerReady)||started} onClick={()=>{setStarted(true);if(mode==="direct")video.current?.play().catch(e=>{setStarted(false);setMessage("Tap play again or check your browser’s media permission.")});else player.current?.playVideo?.();}}>{started?"Tutorial playing · complete the full duration":"Play required tutorial"}</button>}
      {mode === "manual" ? (
        <p>
          This video provider needs coordinator verification. Watch the full
          tutorial and ask your coordinator to verify completion.
        </p>
      ) : (
        <>
          <progress max={required} value={watched} />
          <p>
            {Math.min(watched, required)} / {required} seconds recorded.{" "}
            {watched >= required
              ? "Tutorial complete. Your terms below are now unlocked."
              : "No pause, skip or speed buttons are provided. Keep this page visible while the tutorial plays."}
          </p>
        </>
      )}
      {mode==="manual"&&<a className="button light" href="/support">Ask for tutorial verification →</a>}
      {message && <p role="status">{message}</p>}
      {watched >= required && (
        <a
          className="button dark"
          href="#project-agreement"
        >
          Continue to terms below ↓
        </a>
      )}
      <p className="muted">
        Playback progress records elapsed viewing, not attention or activity on
        the client platform.
      </p>
    </div>
  );
}
