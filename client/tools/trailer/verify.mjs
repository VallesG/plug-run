import { execFileSync, spawnSync } from 'node:child_process';
const OUT = process.env.TRAILER_OUT || new URL('./.out/', import.meta.url).pathname.replace(/\/$/,'');
const REPO = process.env.REPO || new URL('../../../', import.meta.url).pathname.replace(/\/$/,'');
const S=OUT;
const FF=(process.env.FFMPEG||'ffmpeg'), FP=(process.env.FFPROBE||'ffprobe');
// ffmpeg reports filter results (blackdetect, freezedetect, ebur128) on
// STDERR even on success, so both streams have to be read or every check
// silently comes back clean.
const sh=(bin,args)=>{const r=spawnSync(bin,args,{maxBuffer:1<<28});
  return String(r.stdout||'')+String(r.stderr||'');};

export function verifyExport(file){
  const streams=sh(FP,['-v','error','-show_entries',
    'stream=codec_name,codec_type,width,height,r_frame_rate,nb_frames,sample_rate,channels',
    '-show_entries','format=duration,size,bit_rate','-of','json',file]);
  const j=JSON.parse(streams);
  const v=j.streams.find(s=>s.codec_type==='video')||{};
  const a=j.streams.find(s=>s.codec_type==='audio')||null;
  // Black frames: anything over ~0.4s of full black is a defect in a cut.
  const black=sh(FF,['-hide_banner','-i',file,'-vf','blackdetect=d=0.4:pix_th=0.06','-an','-f','null','-'])
    .split('\n').filter(l=>l.includes('blackdetect')).map(l=>l.trim());
  // Loudness of the SFX bed.
  const eb=sh(FF,['-hide_banner','-i',file,'-af','ebur128=peak=true','-f','null','-']);
  // ebur128 prints a running value every frame and then a Summary. Take the
  // LAST match -- the first one is -70 LUFS because the timeline starts silent.
  const grab=re=>{const m=[...eb.matchAll(new RegExp(re.source,'g'))];
    return m.length?m[m.length-1][1].trim():null;};
  // Freeze detection: a cut that sits on one frame reads as a stall.
  const freeze=sh(FF,['-hide_banner','-i',file,'-vf','freezedetect=n=-60dB:d=1.5','-an','-f','null','-'])
    .split('\n').filter(l=>l.includes('freezedetect')).map(l=>l.trim());
  return {file:file.split('/').pop(),
    video:{codec:v.codec_name,w:v.width,h:v.height,fps:v.r_frame_rate,frames:v.nb_frames},
    audio:a?{codec:a.codec_name,rate:a.sample_rate,ch:a.channels}:null,
    durationS:+Number(j.format.duration).toFixed(2), MB:+(Number(j.format.size)/1e6).toFixed(2),
    integratedLUFS:grab(/I:\s*(-?[\d.]+) LUFS/),
    truePeakDB:grab(/Peak:\s*(-?[\d.]+) dBFS/),
    blackRanges:black, freezeRanges:freeze.slice(0,6)};
}

if(process.argv[2]) console.log(JSON.stringify(verifyExport(process.argv[2]),null,1));
