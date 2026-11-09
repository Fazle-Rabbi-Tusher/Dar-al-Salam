import { useId, useState } from 'react';
import { tramState, signalState } from '../../../packages/shared/world-life';
import { Icon } from './Icon';
import { useStore } from './store';

/** Keep React updates at behaviour changes; the canvas still animates every tick. */
export function activityAt(frame: number) {
  const tram = tramState(frame),
    signals = signalState(frame);
  const tramStage =
    tram.service === 'boarding'
      ? tram.doors <= 0.01
        ? ('platform-wait' as const)
        : tram.doors < 0.95
          ? ('doors-opening' as const)
          : tram.service
      : tram.service;
  return {
    tram: tramStage,
    vehicle: signals.vehicle,
    pedestrian: signals.pedestrians,
  };
}
export type WorldActivity = ReturnType<typeof activityAt>;

const copy = {
  en: {
    title: 'Living world',
    preview: 'Preview',
    pause: 'Pause',
    playLabel: 'Preview animation',
    pauseLabel: 'Pause preview',
    live: 'In motion',
    paused: 'Scene paused',
    tram: 'Tram',
    crossing: 'Crossing',
    traffic: 'Traffic',
    'platform-wait': 'Stopped at the platform',
    'doors-opening': 'Doors opening',
    boarding: 'Doors open at the platform',
    'doors-closing': 'Doors closing',
    approaching: 'Arriving at the platform',
    departing: 'Leaving the platform',
    'in-service': 'Travelling along the track',
    'changing-cab': 'Changing cab at the terminus',
    green: 'Vehicles may go',
    amber: 'Prepare to stop',
    red: 'Vehicles must wait',
    walk: 'Safe to cross',
    clearance: 'Crossing clearing',
    wait: 'Wait to cross',
    coast: 'Ship underway',
    coastNote: 'Sails catch the breeze; the wake follows the hull.',
    village: 'Hearth smoke rising',
    villageNote: 'A breeze moves through the clearing.',
    blossom: 'Petals on the breeze',
    blossomNote: 'The lane settles into the evening light.',
    forest: 'Wind in the woodland',
    forestNote: 'The canopy and birds follow the same breeze.',
    day: 'The quarter is alive',
    dayNote: 'People follow their daily routines.',
  },
  ar: {
    title: 'عالم حي',
    preview: 'معاينة',
    pause: 'إيقاف',
    playLabel: 'معاينة الحركة',
    pauseLabel: 'إيقاف المعاينة',
    live: 'العالم يتحرك',
    paused: 'المشهد متوقف',
    tram: 'الترام',
    crossing: 'المعبر',
    traffic: 'المرور',
    'platform-wait': 'متوقف عند الرصيف',
    'doors-opening': 'الأبواب تفتح',
    boarding: 'الأبواب مفتوحة عند الرصيف',
    'doors-closing': 'الأبواب تغلق',
    approaching: 'يصل إلى الرصيف',
    departing: 'يغادر الرصيف',
    'in-service': 'يسير على السكة',
    'changing-cab': 'يستعد للعودة عند نهاية الخط',
    green: 'المركبات تتحرك',
    amber: 'المركبات تبطئ',
    red: 'المركبات تنتظر',
    walk: 'العبور آمن',
    clearance: 'إخلاء المعبر',
    wait: 'انتظر قبل العبور',
    coast: 'السفينة تبحر',
    coastNote: 'النسيم يحرك الأشرعة والأثر يتبع السفينة.',
    village: 'الدخان يتصاعد من المواقد',
    villageNote: 'يمر النسيم عبر الفسحة.',
    blossom: 'بتلات تحملها الريح',
    blossomNote: 'يستقر الدرب في ضوء المساء.',
    forest: 'نسيم في الغابة',
    forestNote: 'تتبع الأشجار والطيور النسيم نفسه.',
    day: 'المحلة تنبض بالحياة',
    dayNote: 'يواصل الناس أنشطتهم اليومية.',
  },
  bn: {
    title: 'প্রাণবন্ত পৃথিবী',
    preview: 'দেখুন',
    pause: 'থামান',
    playLabel: 'অ্যানিমেশন দেখুন',
    pauseLabel: 'অ্যানিমেশন থামান',
    live: 'চলছে',
    paused: 'দৃশ্য থেমে আছে',
    tram: 'ট্রাম',
    crossing: 'পারাপার',
    traffic: 'যান চলাচল',
    'platform-wait': 'প্ল্যাটফর্মে থেমে আছে',
    'doors-opening': 'দরজা খুলছে',
    boarding: 'প্ল্যাটফর্মে দরজা খোলা',
    'doors-closing': 'দরজা বন্ধ হচ্ছে',
    approaching: 'প্ল্যাটফর্মে আসছে',
    departing: 'প্ল্যাটফর্ম ছাড়ছে',
    'in-service': 'রেলপথে চলছে',
    'changing-cab': 'শেষ স্টপে ফেরার প্রস্তুতি',
    green: 'গাড়ি চলছে',
    amber: 'গাড়ি ধীর হচ্ছে',
    red: 'গাড়ি অপেক্ষা করছে',
    walk: 'পার হওয়া নিরাপদ',
    clearance: 'পারাপার শেষ হচ্ছে',
    wait: 'পার হতে অপেক্ষা করুন',
    coast: 'জাহাজ চলছে',
    coastNote: 'পালে বাতাস লাগে; জলের রেখা জাহাজকে অনুসরণ করে।',
    village: 'চিমনি থেকে ধোঁয়া উঠছে',
    villageNote: 'খোলা জায়গায় হাওয়া বইছে।',
    blossom: 'হাওয়ায় ফুলের পাপড়ি',
    blossomNote: 'সন্ধ্যার আলোয় শান্ত হয় গলি।',
    forest: 'বনের হাওয়া',
    forestNote: 'একই হাওয়ায় গাছ আর পাখি চলে।',
    day: 'মহল্লা প্রাণবন্ত',
    dayNote: 'মানুষ তাদের দৈনন্দিন কাজ করে।',
  },
};

export function LivingWorldPanel({
  activity,
  landscape,
}: {
  activity: WorldActivity;
  landscape: string;
}) {
  const lang = useStore((s) => s.lang),
    motion = useStore((s) => s.motion),
    setMotion = useStore((s) => s.setMotion);
  const text = copy[lang] ?? copy.en;
  const [expanded, setExpanded] = useState(() => window.innerWidth > 700);
  const bodyId = useId();
  const scenic =
    landscape === 'coast' ||
    landscape === 'village' ||
    landscape === 'blossom' ||
    landscape === 'forest'
      ? landscape
      : 'day';
  return (
    <section className="living-world-panel" aria-label={text.title}>
      <div className="living-world-heading">
        <button
          type="button"
          className="living-world-expand"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={bodyId}
        >
          <Icon name="leaf" size={15} />
          <span>{text.title}</span>
          <Icon name="chevron" size={13} />
        </button>
        <button
          type="button"
          className="living-world-preview"
          aria-label={motion ? text.pauseLabel : text.playLabel}
          aria-pressed={motion}
          onClick={() => setMotion(!motion)}
        >
          <Icon name={motion ? 'pause' : 'play'} size={13} />
          <span>{motion ? text.pause : text.preview}</span>
        </button>
      </div>
      {expanded && (
        <div className="living-world-body" id={bodyId}>
          <p className="living-world-state">
            <span className={motion ? 'live-dot' : 'paused-dot'} />
            {motion ? text.live : text.paused}
          </p>
          {landscape === 'rain-street' ? (
            <dl>
              <div>
                <dt>{text.tram}</dt>
                <dd data-tram-service={activity.tram}>{text[activity.tram]}</dd>
              </div>
            </dl>
          ) : landscape === 'night-city' ? (
            <dl>
              <div>
                <dt>{text.traffic}</dt>
                <dd data-traffic-state={activity.vehicle}>
                  {text[activity.vehicle]}
                </dd>
              </div>
              <div>
                <dt>{text.crossing}</dt>
                <dd data-crossing-state={activity.pedestrian}>
                  {text[activity.pedestrian]}
                </dd>
              </div>
            </dl>
          ) : (
            <>
              <strong className="living-world-scene">{text[scenic]}</strong>
              <p className="living-world-note">{text[`${scenic}Note`]}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
