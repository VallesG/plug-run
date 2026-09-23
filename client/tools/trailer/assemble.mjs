import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const OUT = process.env.TRAILER_OUT || new URL('./.out/', import.meta.url).pathname.replace(/\/$/,'');
const REPO = process.env.REPO || new URL('../../../', import.meta.url).pathname.replace(/\/$/,'');
const FF=(process.env.FFMPEG||'ffmpeg');
export const FPS=30;
const run=a=>execFileSync(FF,['-y','-loglevel','error',...a],{maxBuffer:1<<28});

/** Cut [startFrame,endFrame) out of a take. Re-encoded, so the cut is frame exact. */
export function cut(src,startFrame,endFrame,out){
  const ss=startFrame/FPS, t=(endFrame-startFrame)/FPS;
  run(['-ss',ss.toFixed(4),'-t',t.toFixed(4),'-i',src,'-an',
    '-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p',out]);
  return {out,seconds:+t.toFixed(2),startFrame,endFrame};
}

/** Portrait gameplay centred on a 1920x1080 field built from the approved cover art. */
export function toLandscape(src,bg,out){
  // The still background is overlay's MAIN input, so it drives output timing.
  // It must therefore be looped AND declared at 30fps -- image2 defaults to
  // 25, which silently broke the 30fps spec and repeated frames into what
  // freezedetect reported as a 3s freeze over the opening shot.
  run(['-i',src,'-loop','1','-framerate','30','-i',bg,'-filter_complex',
    '[1:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,'+
    'boxblur=28:2,eq=brightness=-0.32:saturation=0.75[bg];'+
    '[0:v]scale=-2:1080:flags=lanczos[fg];'+
    '[bg][fg]overlay=(W-w)/2:0:format=auto:shortest=1,fps=30,format=yuv420p[v]',
    '-map','[v]','-an','-r','30','-c:v','libx264','-preset','medium','-crf','16',out]);
  return out;
}

/** Concatenate same-format clips with a short dip between beats. */
export function concat(clips,out){
  const list=clips.map(c=>`file '${c}'`).join('\n');
  const lf=out+'.list.txt'; writeFileSync(lf,list);
  run(['-f','concat','-safe','0','-i',lf,'-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-r','30','-an',out]);
  return out;
}

/** Attach the rebuilt SFX bed. Video is copied, so the picture is untouched. */
export function mux(video,wav,out,{fadeOutFrom}={}){
  const a=['-i',video,'-i',wav,'-map','0:v','-map','1:a','-c:v','copy',
    '-c:a','aac','-b:a','192k','-shortest'];
  if(fadeOutFrom!=null) a.push('-af',`afade=t=out:st=${fadeOutFrom.toFixed(2)}:d=0.8`);
  run([...a,out]);
  return out;
}

export function silentTrack(seconds,out){
  run(['-f','lavfi','-i',`anullsrc=r=48000:cl=stereo`,'-t',String(seconds),'-c:a','pcm_s16le',out]);
  return out;
}

export function probe(f){
  const P=FF.replace(/ffmpeg$/,'ffprobe');
  return execFileSync(P,['-v','error','-show_entries',
    'stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration,size',
    '-of','default=nw=1',f]).toString().trim();
}

/**
 * Lay a music bed under the rebuilt SFX.
 *
 * The bed is pulled well below the SFX so pickups, shots and the engine still
 * read; a limiter catches the sum. plug_beat2 masters hot (-10.4 LUFS, peaking
 * +1.3 dBFS, i.e. already clipped at source), so it cannot simply be dropped
 * in at unity -- musicDb does the pulling down, and startS skips its 1s
 * fade-in so the cut opens on the established beat.
 */
export function mixMusicBed(sfxWav, musicFile, out, { seconds, musicDb = -9, startS = 2.0, fadeOutS = 1.8 }) {
  const outStart = Math.max(0, seconds - fadeOutS);
  run(['-i', sfxWav, '-i', musicFile, '-filter_complex',
    `[1:a]atrim=start=${startS.toFixed(2)},asetpts=PTS-STARTPTS,` +
    `volume=${musicDb}dB,afade=t=in:st=0:d=0.5,` +
    `afade=t=out:st=${outStart.toFixed(2)}:d=${fadeOutS}[m];` +
    `[0:a][m]amix=inputs=2:normalize=0:duration=first[s];` +
    `[s]alimiter=limit=0.94:level=disabled[a]`,
    '-map', '[a]', '-t', String(seconds), '-c:a', 'pcm_s16le', out]);
  return out;
}
