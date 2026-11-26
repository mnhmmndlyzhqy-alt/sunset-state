/* SUNSET STATE — local dialogue grounded in the actual resident and island state. */
(function(H){
  'use strict';
  const activities={
    walk:['אני בדרך לפינה הבאה בשכונה.','אני יוצא לסיבוב קצר.'],
    browse:['עצרתי להסתכל על החנות הזאת.','אני מסתכל בחלון הראווה.'],
    social:['עצרתי לדבר קצת עם השכנים.','נחמד לפגוש אנשים בדרך.'],
    wait:['אני מחכה שהדרך תהיה פנויה.','אני מעדיף לחכות רגע לפני שאמשיך.'],
    rest:['אני לוקח הפסקה קצרה.','אני נח קצת לפני שאמשיך.'],
    recover:['אני נרגע קצת אחרי מה שקרה כאן.','אחכה שהסביבה תירגע לפני שאמשיך.'],
    flee:['אני מנסה להתרחק מהסכנה.'],
    talk:['כרגע אני מדבר איתך.'],
    home:['אני בדרך לדירה שלי.','אני מבלה קצת בבית.'],
    garden:['אני יוצא ליהנות מהגינה.'],
    stroll:['אני עושה סיבוב ליד הבית.']
  };
  function choose(m,key,rows){
    m.residentPhrases53??=new Map();
    const previous=m.residentPhrases53.get(key)??-1;
    const index=(previous+1+(previous<0?(m.h||0)%rows.length:0))%rows.length;
    m.residentPhrases53.set(key,index);
    return rows[index];
  }
  function lease(g,w){
    if(!w.estateResident||g.world?.estate53?.actors?.get(w.estateResident)!==w)return null;
    return H.estate53?.residents().find(r=>r.id===w.estateResident)||null;
  }
  function name(g,w){
    const r=lease(g,w);
    return r?.name||null;
  }
  function reply(g,w,input,m){
    if(!g||!w||!m)return null;
    const norm=H.realism39.chat48?.normalize(input)||(' '+String(input)+' ');
    const resident=lease(g,w),management=H.estate53;
    const answer=(key,text)=>({parts:[Array.isArray(text)?choose(m,key,text):text],mood:'neutral',end:false});
    if(resident&&/(?:איך קוראים לך|מה השם שלך|מה שמך|מי אתה|מי את)(?: |$)/.test(norm)){
      m.told=true;
      return answer('name','קוראים לי '+resident.name+'.');
    }
    if(resident&&/(?:איפה (?:אתה גר|את גרה|הבית שלך|הדירה שלך)|באיזו דירה|איזה דירה|איפה אתה מתגורר|איפה את מתגוררת)/.test(norm)){
      const unit=management.units().find(u=>u.id===resident.unit);
      return answer('home','הדירה שלי היא '+(unit?.name||resident.unit.toUpperCase())+'. קיבלתי ממך אישור לעבור אליה.');
    }
    if(resident&&/(?:שכירות|שכר דירה|שוכר|שוכרת|חוזה)/.test(norm)){
      if(/(?:לשנות|להוריד|להעלות|משא ומתן|מחיר חדש)/.test(norm))
        return answer('contract','החוזה שלנו כבר חתום במחיר '+resident.rent+' קרדיטים. את ההצעות לדיירים חדשים מנהלים במשרד האי.');
      return answer('rent','סיכמנו על '+resident.rent+' קרדיטים בכל '+management.cycle+' שניות משחק פעילות. התשלום לפי החוזה שאישרת.');
    }
    if(resident&&/(?:מה חסר|מה לשפר|מה צריך|איך האי|אוהב את האי|אוהבת את האי|טוב לך|מרוצה|איכות הדירה)/.test(norm)){
      const f=management.finances(),level=management.upgradeLevel;
      if(f.condition<80)return answer('condition','כדאי לטפל בתשתיות של האי. המצב שלהן כרגע '+f.condition+' מתוך מאה.');
      if(!level('water'))return answer('water','אספקת מים טובה תהיה השיפור הכי מועיל לדירות כרגע.');
      if(!level('power'))return answer('power','אשמח לחשמל ותאורה טובים יותר באזור המגורים.');
      if(!level('furniture'))return answer('furniture','הריהוט עדיין בסיסי. מיטה ופינת ישיבה טובות יותר ישפרו את הבית.');
      if(!level('garden'))return answer('garden','גינה משותפת תהיה מקום נעים להיפגש בו.');
      if(!level('cafe'))return answer('cafe','כבר נעים לגור כאן. בית קפה יוסיף מקום מפגש לשכנים.');
      return answer('happy',['הדירה והסביבה כבר נעימות. תודה על ההשקעה באי.','יש כאן מים, חשמל וגינה. נעים שיש מקום להיפגש עם השכנים.']);
    }
    if(/(?:מה אתה עושה|מה את עושה|לאן אתה הולך|לאן את הולכת|למה עצרת|למה אתה מחכה|למה את מחכה)/.test(norm)){
      const state=H.residentAI53?.stateOf(w);
      const current=w.estateActivity53||state?.activity;
      const activity=({goingHome:'home',greeting:'talk',conversation:'talk',alert:'flee'})[current]||current;
      if(activities[activity])return answer('activity:'+activity,activities[activity]);
    }
    if(/(?:איפה|איך מגיע|איך הולכ|לאן|כיוון)/.test(norm)&&/(?:אי שלי|לאי שלי|האי שלך|אי פרטי|לאי הפרטי|לאי הגדול|האי הגדול)/.test(norm)){
      if(H.estate53World?.walkable(w.x,w.z))
        return answer('estate-here','אנחנו כבר באי שלך. המשרד מסומן במפה; לידו לחץ I לניהול הדירות והשכירות.');
      return answer('estate-way','האי הפרטי נמצא ממזרח לעיר. במרינה או במנחת בחר יעד עם B. למכונית יש מעבורת רכבים, ולמטוס יש מסלול נחיתה באי.');
    }
    if(resident&&/(?:איפה|איך מגיע|איך הולכ|לאן)/.test(norm)&&/(?:משרד|ניהול|לנהל|דיירים)/.test(norm))
      return answer('office','משרד האי ליד אזור המגורים, והוא מסומן במפה. ליד המשרד לחץ I כדי לנהל שדרוגים, דיירים ושכירות.');
    if(resident&&/(?:איך חוזר|איך חוזרים|לעיר|לעזוב את האי|מעבורת|סירה|מטוס|מסוק)/.test(norm))
      return answer('travel','הרציף והמנחת נמצאים בצד המערבי של האי. לידם בוחרים יעד עם B. מסלול המטוסים נמצא מצפון למגורים.');
    return null;
  }
  H.residentDialogue53={reply,name};
})(Heatline);
