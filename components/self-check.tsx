import { ArrowRight, Fingerprint, MapPin, Clock3, Link2, ShieldCheck, ScanLine, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getAdvice, selfOptions } from '@/lib/self-check-engine';

const groups = [
  { id: 'identity', label: '身分', Icon: Fingerprint },
  { id: 'location', label: '位置', Icon: MapPin },
  { id: 'time', label: '時間', Icon: Clock3 },
  { id: 'link', label: '關聯', Icon: Link2 },
];

export function SelfCheck({ selected, onToggle, onSubmit }: { selected: string[]; onToggle: (id: string) => void; onSubmit: () => void }) {
  function choice(option: (typeof selfOptions)[number]) {
    return <label key={option.id} className={'self-choice' + (selected.includes(option.id) ? ' selected' : '')}>
      <Checkbox checked={selected.includes(option.id)} onCheckedChange={() => onToggle(option.id)} />
      <span>{option.label}</span>
    </label>;
  }
  return <main className="self-main">
    <div className="case-label"><span className="signal" /> 04 回到自己 <span>八題情境測驗已完成</span></div>
    <h1>剛剛是沈有稜，<br /><em>現在，想想你自己。</em></h1>
    <p className="lead">你平常可能公開哪些資訊？<br />勾選符合的類型，找出可以帶回日常的回查重點。</p>
    <div className="self-privacy"><ShieldCheck size={21} /><p>只選資訊類型，不必提供姓名、帳號或實際內容。這一段沒有對錯，也不計入測驗分數。</p></div>
    <form onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <div className="self-group-grid">{groups.map(({ id, label, Icon }) => <fieldset className="self-group" key={id}>
        <legend><Icon size={20} />{label}</legend>
        <div>{selfOptions.filter(option => option.category === id).map(choice)}</div>
      </fieldset>)}</div>
      <fieldset className="self-other"><legend>其他情況</legend>{selfOptions.filter(option => option.category === 'other').map(choice)}</fieldset>
      <p className="self-hint">「以上皆無」會取消其他選項。若有未列出的類型，可選「其他資訊類型」，再用四項回查問題自行檢查。</p>
      <div className="self-submit"><span aria-live="polite">已選 {selected.length} 項</span><Button className="primary-button" type="submit" disabled={selected.length === 0}>查看結果與我的回查建議 <ArrowRight /></Button></div>
    </form>
  </main>;
}

export function PersonalAdvice({ selected, onEdit }: { selected: string[]; onEdit: () => void }) {
  const advice = getAdvice(selected);
  return <section className="personal-section" aria-labelledby="personal-title">
    <div className="personal-heading"><div><div className="eyebrow">把練習帶回自己</div><h2 id="personal-title">我的回查重點</h2></div><Button variant="outline" className="text-button" onClick={onEdit}><PencilLine size={16} />修改勾選</Button></div>
    <p className="personal-caption">根據你勾選的資訊類型整理，沒有查閱你的真實帳號，也不評定個人危險程度。</p>
    <div className="selected-types" aria-label="本次勾選的資訊類型">{selfOptions.filter(option => selected.includes(option.id)).map(option => <span key={option.id}>{option.label}</span>)}</div>
    {advice.length ? <div className="advice-list">{advice.map((item, index) => <article className="advice-card" key={item.id}>
      <div className="advice-order"><ScanLine size={18} /><span>{index === 0 ? '先從這裡開始' : '也一起檢查'}</span><small>0{index + 1}</small></div>
      <h3>{item.title}</h3><p className="advice-evidence">你勾選了：{item.matchedLabels.join('、')}</p><p>{item.explanation}</p>
      <ol>{item.actions.map(action => <li key={action}>{action}</li>)}</ol>
    </article>)}</div> : <div className="self-empty"><ShieldCheck size={25} /><div><h3>先用四項問題，回查一次。</h3><p>你選擇「以上皆無」，目前沒有對應的勾選建議。這不表示帳號一定安全；可以再看看舊貼文、文件與公開簡介是否透露身分、位置、時間或平台關聯。</p></div></div>}
  </section>;
}
