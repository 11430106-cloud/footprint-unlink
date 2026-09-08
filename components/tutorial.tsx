import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function Tutorial({onBack,onChecklist}:{onBack:()=>void;onChecklist:()=>void}) {
 return <main className="reading-main"><Button variant="ghost" className="text-button" onClick={onBack}><ArrowLeft/>返回測驗</Button><div className="eyebrow">使用教學</div><h1>用五分鐘，練習看懂數位足跡。</h1><p className="lead">全部使用虛構案例，不需要準備自己的帳號或文件。</p>
 <ol className="tutorial-steps">{[
 ['開始體驗','首頁點選「開始體驗」，認識身分、位置、時間與關聯四種線索，再點「開始辨識」。'],
 ['觀察資料卡、選擇答案','依序完成 8 題。「單選」只選一項；「複選」可選多項。勾選後點「確認答案」。複選題需完整答對，才計為答對。'],
 ['閱讀每題的解說','送出後可查看正確答案，以及漏選或多選的原因。答案送出後即鎖定，閱讀完再點「下一題」。'],
 ['檢查示範修正版','第 8 題一律使用已採用建議防護方式的資料，與前面怎麼作答無關。只根據畫面上的公開內容判斷。'],
 ['回到自己','勾選平常可能公開的資訊類型，例如運動路線或相同帳號。不填寫真實個資；「以上皆無」與其他選項互斥，這一段不計分。'],
 ['查看結果與採取行動','完成後查看三構面分數與「我的回查重點」。建議依照勾選組合整理，可用「修改勾選」調整，不會更動測驗分數。分數代表作答表現，不等於真實帳號安全程度。'],
 ['保存檢核卡，或再次練習','點「查看完整檢核卡」，可勾選檢查項目並列印／另存 PDF。點「重新挑戰」可清空本次答案重新練習。']
 ].map(([title,copy],i)=><li key={title}><span>0{i+1}</span><div><h2>{title}</h2><p>{copy}</p></div></li>)}</ol>
 <div className="guide-note"><h2>計分與隱私</h2><p>辨識 4 題占 40 分、斷鏈 3 題占 40 分、回查 1 題占 20 分。各階段依答對題數等比例換算，再四捨五入為整數；總分為三項分數相加。80 分以上為「斷鏈高手」、60–79 分為「足跡觀察員」、59 分以下為「線索待清理」。</p><p>測驗不要求姓名、帳號或上傳資料，不使用外部 AI 分析，也不設廣告追蹤碼。答案、自我檢核與分數只在瀏覽器記憶體計算，重新整理或關閉頁面即不保留。</p></div>
 <Button className="primary-button" onClick={onChecklist}>查看完整檢核卡 <ArrowRight/></Button></main>;
}
