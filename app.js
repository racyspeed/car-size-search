const SUPABASE_URL =
"https://klfijtvnbgdkqcslntsp.supabase.co";

const SUPABASE_ANON_KEY =
"sb_publishable_jm8kPE51RZJitnkw11orxA_au9j3f6Z";

const supabaseClient =
supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);

const reservationList =
document.getElementById("reservationList");

const tabButtons =
document.querySelectorAll(".tab-btn");

const pendingCount =
document.getElementById("pendingCount");

const confirmedCount =
document.getElementById("confirmedCount");

const rejectedCount =
document.getElementById("rejectedCount");

const monthSales =
document.getElementById("monthSales");

const calendarGrid =
document.getElementById("calendarGrid");

const calendarTitle =
document.getElementById("calendarTitle");

const listTitle =
document.getElementById("listTitle");

const prevMonthBtn =
document.getElementById("prevMonthBtn");

const nextMonthBtn =
document.getElementById("nextMonthBtn");

let currentStatus = "仮予約";
let calendarDate = new Date();
let customersCache = [];

const ADMIN_PASSWORD = "RACYSPEED2026";

function checkAdminPassword(){

 const input =
 document.getElementById("adminPasswordInput");

 const error =
 document.getElementById("loginError");

 if(input.value === ADMIN_PASSWORD){

   sessionStorage.setItem("racyspeed_admin_login","ok");

   document.getElementById("loginScreen").style.display = "none";
   document.getElementById("adminApp").style.display = "block";

   loadDashboard();
   loadAdminCalendar();
   loadReservations();

 }else{
   error.textContent = "パスワードが違います。";
 }

}

const adminPasswordInput =
document.getElementById("adminPasswordInput");

if(adminPasswordInput){
 adminPasswordInput.addEventListener("keydown", function(e){
   if(e.key === "Enter"){
     checkAdminPassword();
   }
 });
}

function startAdminAppIfLoggedIn(){

 if(sessionStorage.getItem("racyspeed_admin_login") === "ok"){
   document.getElementById("loginScreen").style.display = "none";
   document.getElementById("adminApp").style.display = "block";

   loadDashboard();
   loadAdminCalendar();
   loadReservations();
 }

}


async function loadDashboard(){

 const {data,error} =
 await supabaseClient
 .from("reservations")
 .select("*");

 if(error){
   console.error(error);
   pendingCount.textContent = "-";
   confirmedCount.textContent = "-";
   rejectedCount.textContent = "-";
   monthSales.textContent = "-";
   return;
 }

 const reservations = data || [];

 const pending =
 reservations.filter(r => r.status === "仮予約").length;

 const confirmed =
 reservations.filter(r => r.status === "予約確定").length;

 const rejected =
 reservations.filter(r => r.status === "却下").length;

 const today = new Date();
 const year = today.getFullYear();
 const month = String(today.getMonth() + 1).padStart(2,"0");
 const monthPrefix = `${year}-${month}`;

 const sales =
 reservations
 .filter(r =>
   r.status === "予約確定" &&
   String(r.start_date || "").startsWith(monthPrefix)
 )
 .reduce((sum,r) => {
   return sum + Number(r.total_price || 0);
 },0);

 pendingCount.textContent = pending;
 confirmedCount.textContent = confirmed;
 rejectedCount.textContent = rejected;
 monthSales.textContent =
 sales.toLocaleString() + "円";

}

async function loadAdminCalendar(){

 calendarGrid.innerHTML = "";

 const year = calendarDate.getFullYear();
 const month = calendarDate.getMonth();

 calendarTitle.textContent =
 `${year}年${month + 1}月`;

 const monthStart =
 `${year}-${String(month + 1).padStart(2,"0")}-01`;

 const lastDay =
 new Date(year, month + 1, 0).getDate();

 const monthEnd =
 `${year}-${String(month + 1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;

 const {data,error} =
 await supabaseClient
 .from("reservations")
 .select("*")
 .eq("status","予約確定")
 .lte("start_date",monthEnd)
 .gte("end_date",monthStart)
 .order("start_date",{ascending:true})
 .order("start_time",{ascending:true});

 if(error){
   console.error(error);
   calendarGrid.innerHTML =
   `<div class="empty">カレンダー取得に失敗しました</div>`;
   return;
 }

 const confirmedReservations = data || [];

 const weekdays = ["日","月","火","水","木","金","土"];

 weekdays.forEach(day=>{
   const div = document.createElement("div");
   div.className = "calendar-weekday";
   div.textContent = day;
   calendarGrid.appendChild(div);
 });

 const firstWeekday =
 new Date(year, month, 1).getDay();

 for(let i=0;i<firstWeekday;i++){
   const empty = document.createElement("div");
   empty.className = "calendar-day empty";
   calendarGrid.appendChild(empty);
 }

 for(let day=1; day<=lastDay; day++){

   const dateText =
   `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

   const dayReservations =
   confirmedReservations.filter(r =>
     r.start_date <= dateText &&
     r.end_date >= dateText
   );

   const div = document.createElement("div");
   div.className =
   "calendar-day" +
   (dayReservations.length ? " has-reservation" : "");

   div.innerHTML =
   `<div class="calendar-day-number">${day}</div>`;

   if(dayReservations.length){
     div.innerHTML +=
     `<div class="calendar-count">${dayReservations.length}件</div>`;

     dayReservations.slice(0,2).forEach(r=>{
       div.innerHTML +=
       `<div class="calendar-menu">
          ${escapeHtml(r.menu_name || "")}
        </div>`;
     });
   }

   div.addEventListener("click",()=>{
     showReservationsByDate(dateText);
   });

   calendarGrid.appendChild(div);
 }

}

async function showReservationsByDate(dateText){

 listTitle.textContent =
 `${dateText} の予約確定一覧`;

 tabButtons.forEach(b=>b.classList.remove("active"));

 reservationList.innerHTML =
 `<div class="empty">読み込み中...</div>`;

 const {data,error} =
 await supabaseClient
 .from("reservations")
 .select("*")
 .eq("status","予約確定")
 .lte("start_date",dateText)
 .gte("end_date",dateText)
 .order("start_time",{ascending:true});

 if(error){
   console.error(error);
   reservationList.innerHTML =
   `<div class="empty">予約取得に失敗しました</div>`;
   return;
 }

 renderReservations(data || []);

}


async function loadCustomers(){

 listTitle.textContent = "顧客一覧";

 reservationList.innerHTML =
 `<div class="empty">顧客情報を読み込み中...</div>`;

 const {data,error} =
 await supabaseClient
 .from("customers")
 .select("*")
 .order("last_visit_date",{ascending:false, nullsFirst:false})
 .order("created_at",{ascending:false});

 if(error){
   console.error(error);

   reservationList.innerHTML =
   `<div class="empty">
      顧客一覧の取得に失敗しました
    </div>`;

   return;
 }

 customersCache = data || [];

 renderCustomers(customersCache);

}

function renderCustomers(customers){

 if(!customers || customers.length === 0){

   reservationList.innerHTML =
   `<div class="empty">
      顧客はまだ登録されていません
    </div>`;

   return;
 }

 reservationList.innerHTML =
 `
 <div class="customer-toolbar">
   <input
     class="customer-search"
     id="customerSearchInput"
     type="text"
     placeholder="名前・電話番号で検索"
     oninput="filterCustomers()"
   >
 </div>

 <div id="customerCards">
   ${customers.map(c => renderCustomerCard(c)).join("")}
 </div>
 `;

}

function renderCustomerCard(c){

 const name =
 escapeHtml(c.customer_name || "名前未登録");

 const phone =
 escapeHtml(c.phone || "-");

 const visitCount =
 Number(c.total_visit_count || 0);

 const totalSpent =
 Number(c.total_spent || 0).toLocaleString() + "円";

 const lastVisit =
 c.last_visit_date
 ? escapeHtml(c.last_visit_date)
 : "-";

 const firstVisit =
 c.first_visit_date
 ? escapeHtml(c.first_visit_date)
 : "-";

 return `
 <div class="customer-card">

   <div class="customer-head">
     <div>
       <div class="customer-name">${name}</div>
       <div class="customer-phone">TEL：${phone}</div>
     </div>

     <button
       class="action-btn"
       onclick="loadCustomerDetail('${c.id}')">
       詳細を見る
     </button>
   </div>

   <div class="customer-stats">
     <div class="customer-stat">
       <div class="customer-stat-label">来店回数</div>
       <div class="customer-stat-value">${visitCount}回</div>
     </div>

     <div class="customer-stat">
       <div class="customer-stat-label">累計金額</div>
       <div class="customer-stat-value">${totalSpent}</div>
     </div>

     <div class="customer-stat">
       <div class="customer-stat-label">最終来店</div>
       <div class="customer-stat-value">${lastVisit}</div>
     </div>
   </div>

   <div class="customer-car">
     初回来店：${firstVisit}
   </div>

 </div>
 `;

}


async function loadCustomerDetail(customerId){

 listTitle.textContent = "顧客詳細";

 reservationList.innerHTML =
 `<div class="empty">顧客詳細を読み込み中...</div>`;

 const {data:customer,error:customerError} =
 await supabaseClient
 .from("customers")
 .select("*")
 .eq("id",customerId)
 .single();

 if(customerError || !customer){
   console.error(customerError);
   reservationList.innerHTML =
   `<div class="empty">顧客情報の取得に失敗しました</div>`;
   return;
 }

 const {data:cars,error:carsError} =
 await supabaseClient
 .from("customer_cars")
 .select("*")
 .eq("customer_id",customerId)
 .order("created_at",{ascending:true});

 if(carsError){
   console.error(carsError);
 }

 const {data:history,error:historyError} =
 await supabaseClient
 .from("reservations")
 .select("*")
 .eq("phone",customer.phone)
 .eq("status","予約確定")
 .order("start_date",{ascending:false})
 .order("start_time",{ascending:false});

 if(historyError){
   console.error(historyError);
 }

 const {data:followups,error:followupsError} =
 await supabaseClient
 .from("customer_followups")
 .select("*")
 .eq("customer_id",customerId)
 .order("follow_date",{ascending:true});

 if(followupsError){
   console.error(followupsError);
 }

 renderCustomerDetail(
   customer,
   cars || [],
   history || [],
   followups || []
 );

}

function renderCustomerDetail(customer,cars,history,followups){

 const totalSpent =
 Number(customer.total_spent || 0).toLocaleString() + "円";

 const visitCount =
 Number(customer.total_visit_count || 0) + "回";

 const firstVisit =
 customer.first_visit_date || "-";

 const lastVisit =
 customer.last_visit_date || "-";

 reservationList.innerHTML =
 `
 <div class="back-area">
   <button class="action-btn" onclick="loadCustomers()">
     顧客一覧へ戻る
   </button>
 </div>

 <div class="customer-detail">

   <div class="customer-detail-top">
     <div>
       <div class="customer-detail-name">
         ${escapeHtml(customer.customer_name || "名前未登録")}
       </div>

       <div class="customer-detail-info">
         <div>TEL：${escapeHtml(customer.phone || "-")}</div>
         <div>メール：${escapeHtml(customer.email || "-")}</div>
         <div>LINEフォロー：${customer.allow_line_follow ? "許可" : "停止"}</div>
       </div>
     </div>
   </div>

   <div class="detail-grid">
     <div class="detail-box">
       <div class="detail-box-label">累計来店</div>
       <div class="detail-box-value">${visitCount}</div>
     </div>

     <div class="detail-box">
       <div class="detail-box-label">累計売上</div>
       <div class="detail-box-value">${totalSpent}</div>
     </div>

     <div class="detail-box">
       <div class="detail-box-label">最終来店</div>
       <div class="detail-box-value">${escapeHtml(lastVisit)}</div>
     </div>
   </div>

   <div class="customer-detail-info">
     初回来店：${escapeHtml(firstVisit)}
   </div>

 </div>

 <h2 class="section-title">車両情報</h2>
 <div class="edit-note">
   車両情報は管理者用です。ナンバー・色・メモなどを後から編集できます。
 </div>
 <div class="inline-actions">
   <button class="action-btn" onclick="addCustomerCar('${customer.id}')">
     車両を追加
   </button>
 </div>
 ${renderCustomerCars(cars)}

 <h2 class="section-title">施工履歴</h2>
 <div class="edit-note">
   施工履歴は予約確定データを表示しています。内容修正はLINE通知・Googleカレンダーには影響しません。
 </div>
 ${renderCustomerHistory(history)}

 <h2 class="section-title">次回おすすめ</h2>
 ${renderCustomerFollowups(customer, followups)}
 `;

}


function renderCustomerFollowups(customer, followups){

 if(!followups || followups.length === 0){
   return `
   <div class="empty">
     次回おすすめはまだありません
   </div>`;
 }

 return `
 <div class="followup-list">
   ${followups.map(f => renderFollowupCard(customer, f)).join("")}
 </div>
 `;

}

function renderFollowupCard(customer, f){

 const today = new Date();
 today.setHours(0,0,0,0);

 const followDate = new Date(f.follow_date + "T00:00:00");
 const diffMs = followDate.getTime() - today.getTime();
 const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

 let badgeText = "";
 let badgeClass = "ok";
 let cardClass = "";

 if(f.status === "送信済み"){
   badgeText = "送信済み";
   badgeClass = "ok";
 }else if(diffDays < 0){
   badgeText = `${Math.abs(diffDays)}日過ぎています`;
   badgeClass = "over";
   cardClass = "overdue";
 }else if(diffDays === 0){
   badgeText = "今日が案内日";
   badgeClass = "warn";
   cardClass = "due-soon";
 }else if(diffDays <= 14){
   badgeText = `あと${diffDays}日`;
   badgeClass = "warn";
   cardClass = "due-soon";
 }else{
   badgeText = `あと${diffDays}日`;
   badgeClass = "ok";
 }

 const message =
 buildFollowupLineMessage(customer, f);

 return `
 <div class="followup-card ${cardClass}">

   <div class="followup-head">
     <div class="followup-title">
       ${escapeHtml(f.follow_title || "-")}
     </div>

     <div class="followup-badge ${badgeClass}">
       ${escapeHtml(badgeText)}
     </div>
   </div>

   <div class="followup-info">
     <div>案内予定日：${escapeHtml(f.follow_date || "-")}</div>
     <div>状態：${escapeHtml(f.status || "未対応")}</div>
     <div>種類：${escapeHtml(f.follow_type || "-")}</div>
   </div>

   <div class="followup-message-box">${escapeHtml(message)}</div>

   <div class="actions">
     <button
       class="action-btn"
       onclick="copyFollowupMessage('${f.id}')">
       LINE文面コピー
     </button>

     <button
       class="action-btn"
       onclick="markFollowupSent('${f.id}')">
       送信済みにする
     </button>
   </div>

 </div>
 `;

}

function buildFollowupLineMessage(customer, followup){

 const customerName =
 customer.customer_name || "お客様";

 const title =
 followup.follow_title || "メンテナンスのご案内";

 const message =
 followup.follow_message ||
 "お車のメンテナンス時期となりました。";

 return `RACY'SPEEDです。

${customerName}様

${message}

おすすめ内容：
${title}

ご都合の良いタイミングでご予約ください。

ご予約・お問い合わせはこちら
https://www.racyspeed.com/`;

}

async function copyFollowupMessage(followupId){

 const {data:followup,error:followupError} =
 await supabaseClient
 .from("customer_followups")
 .select("*")
 .eq("id",followupId)
 .single();

 if(followupError || !followup){
   console.error(followupError);
   alert("フォロー情報の取得に失敗しました");
   return;
 }

 const {data:customer,error:customerError} =
 await supabaseClient
 .from("customers")
 .select("*")
 .eq("id",followup.customer_id)
 .single();

 if(customerError || !customer){
   console.error(customerError);
   alert("顧客情報の取得に失敗しました");
   return;
 }

 const message =
 buildFollowupLineMessage(customer, followup);

 try{
   await navigator.clipboard.writeText(message);
   alert("LINE文面をコピーしました");
 }catch(error){
   console.error(error);
   alert(message);
 }

}

async function markFollowupSent(followupId){

 if(!confirm("このフォローを送信済みにしますか？")){
   return;
 }

 const {data,error} =
 await supabaseClient
 .from("customer_followups")
 .update({
   status:"送信済み",
   line_sent_at:new Date().toISOString()
 })
 .eq("id",followupId)
 .select("*")
 .single();

 if(error){
   console.error(error);
   alert("更新に失敗しました");
   return;
 }

 alert("送信済みにしました");

 if(data && data.customer_id){
   loadCustomerDetail(data.customer_id);
 }

}



async function addCustomerCar(customerId){

 const maker =
 prompt("メーカーを入力してください\n例：LEXUS");

 if(maker === null){
   return;
 }

 const model =
 prompt("車種を入力してください\n例：RX500h");

 if(model === null){
   return;
 }

 const size =
 prompt("サイズを入力してください\n例：L");

 if(size === null){
   return;
 }

 const plateNumber =
 prompt("ナンバーを入力してください\n未入力でもOK");

 if(plateNumber === null){
   return;
 }

 const color =
 prompt("カラーを入力してください\n未入力でもOK");

 if(color === null){
   return;
 }

 const memo =
 prompt("車両メモを入力してください\n未入力でもOK");

 if(memo === null){
   return;
 }

 const {error} =
 await supabaseClient
 .from("customer_cars")
 .insert({
   customer_id:customerId,
   maker:maker.trim(),
   model:model.trim(),
   size:size.trim(),
   plate_number:plateNumber.trim(),
   color:color.trim(),
   memo:memo.trim(),
   is_main:true
 });

 if(error){
   console.error(error);
   alert("車両追加に失敗しました");
   return;
 }

 alert("車両情報を追加しました");
 loadCustomerDetail(customerId);

}

async function editCustomerCar(carId){

 const {data:car,error} =
 await supabaseClient
 .from("customer_cars")
 .select("*")
 .eq("id",carId)
 .single();

 if(error || !car){
   console.error(error);
   alert("車両情報の取得に失敗しました");
   return;
 }

 const maker =
 prompt("メーカーを編集してください", car.maker || "");

 if(maker === null){
   return;
 }

 const model =
 prompt("車種を編集してください", car.model || "");

 if(model === null){
   return;
 }

 const size =
 prompt("サイズを編集してください", car.size || "");

 if(size === null){
   return;
 }

 const plateNumber =
 prompt("ナンバーを編集してください", car.plate_number || "");

 if(plateNumber === null){
   return;
 }

 const color =
 prompt("カラーを編集してください", car.color || "");

 if(color === null){
   return;
 }

 const memo =
 prompt("メモを編集してください", car.memo || "");

 if(memo === null){
   return;
 }

 const {error:updateError} =
 await supabaseClient
 .from("customer_cars")
 .update({
   maker:maker.trim(),
   model:model.trim(),
   size:size.trim(),
   plate_number:plateNumber.trim(),
   color:color.trim(),
   memo:memo.trim()
 })
 .eq("id",carId);

 if(updateError){
   console.error(updateError);
   alert("車両情報の更新に失敗しました");
   return;
 }

 alert("車両情報を更新しました");
 loadCustomerDetail(car.customer_id);

}

async function editReservationHistory(reservationId){

 const {data:r,error} =
 await supabaseClient
 .from("reservations")
 .select("*")
 .eq("id",reservationId)
 .single();

 if(error || !r){
   console.error(error);
   alert("施工履歴の取得に失敗しました");
   return;
 }

 const confirmMessage =
 "施工履歴を編集します。\n\n※これは管理画面表示用の修正です。\n※LINE通知やGoogleカレンダーは変更されません。";

 if(!confirm(confirmMessage)){
   return;
 }

 const startDateInput =
 prompt("施工開始日を編集してください\n例：2026-07-10\n空欄の場合は未設定になります", r.start_date || "");

 if(startDateInput === null){
   return;
 }

 const endDateInput =
 prompt("施工終了日を編集してください\n例：2026-07-12\n空欄の場合は未設定になります", r.end_date || "");

 if(endDateInput === null){
   return;
 }

 const maker =
 prompt("メーカーを編集してください", r.maker || "");

 if(maker === null){
   return;
 }

 const model =
 prompt("車種を編集してください", r.model || "");

 if(model === null){
   return;
 }

 const size =
 prompt("サイズを編集してください", r.size || "");

 if(size === null){
   return;
 }

 const menuName =
 prompt("施工メニューを編集してください", r.menu_name || "");

 if(menuName === null){
   return;
 }

 const options =
 prompt("オプションを編集してください", r.options || "");

 if(options === null){
   return;
 }

 const totalPriceText =
 prompt("施工金額を数字だけで編集してください\n例：198000\n空欄の場合は0円になります", r.total_price || "");

 if(totalPriceText === null){
   return;
 }

 const totalPrice =
 Number(String(totalPriceText).replaceAll(",","").replaceAll("円","").trim() || 0);

 if(Number.isNaN(totalPrice)){
   alert("金額は数字で入力してください");
   return;
 }

 const startTimeInput =
 prompt("開始時間を編集してください\n例：10:00\n空欄の場合は未設定になります", r.start_time || "");

 if(startTimeInput === null){
   return;
 }

 const endTimeInput =
 prompt("終了時間を編集してください\n例：18:00\n空欄の場合は未設定になります", r.end_time || "");

 if(endTimeInput === null){
   return;
 }

 const startDate =
 normalizeDateInput(startDateInput);

 const endDate =
 normalizeDateInput(endDateInput);

 const startTime =
 normalizeTimeInput(startTimeInput);

 const endTime =
 normalizeTimeInput(endTimeInput);

 if(startDateInput.trim() && !startDate){
   alert("施工開始日は 2026-07-10 の形で入力してください");
   return;
 }

 if(endDateInput.trim() && !endDate){
   alert("施工終了日は 2026-07-12 の形で入力してください");
   return;
 }

 if(startTimeInput.trim() && !startTime){
   alert("開始時間は 10:00 の形で入力してください");
   return;
 }

 if(endTimeInput.trim() && !endTime){
   alert("終了時間は 18:00 の形で入力してください");
   return;
 }

 const updatePayload = {
   start_date:startDate,
   end_date:endDate,
   maker:maker.trim() || null,
   model:model.trim() || null,
   size:size.trim() || null,
   menu_name:menuName.trim() || null,
   options:options.trim() || null,
   total_price:totalPrice,
   start_time:startTime,
   end_time:endTime
 };

 const {error:updateError} =
 await supabaseClient
 .from("reservations")
 .update(updatePayload)
 .eq("id",reservationId);

 if(updateError){
   console.error(updateError);
   alert(
     "施工履歴の更新に失敗しました\n\n" +
     "原因：" + (updateError.message || "不明なエラー")
   );
   return;
 }

 await refreshCustomerSummaryByPhone(r.phone);

 alert("施工履歴を更新しました");

 const {data:customer,error:customerError} =
 await supabaseClient
 .from("customers")
 .select("*")
 .eq("phone",r.phone)
 .single();

 if(!customerError && customer && customer.id){
   loadCustomerDetail(customer.id);
   return;
 }

 loadCustomers();

}

function normalizeDateInput(value){

 const text =
 String(value || "").trim();

 if(!text){
   return null;
 }

 const hyphenDatePattern =
 new RegExp("^\\d{4}-\\d{2}-\\d{2}$");

 const slashDatePattern =
 new RegExp("^\\d{4}/\\d{1,2}/\\d{1,2}$");

 if(hyphenDatePattern.test(text)){
   return text;
 }

 if(slashDatePattern.test(text)){
   const parts = text.split("/");
   return (
     parts[0] + "-" +
     String(parts[1]).padStart(2,"0") + "-" +
     String(parts[2]).padStart(2,"0")
   );
 }

 return null;

}

function normalizeTimeInput(value){

 const text =
 String(value || "").trim();

 if(!text){
   return null;
 }

 const timePattern =
 new RegExp("^\\d{1,2}:\\d{2}$");

 if(timePattern.test(text)){
   const parts = text.split(":");
   return String(parts[0]).padStart(2,"0") + ":" + parts[1];
 }

 return null;

}


async function refreshCustomerSummaryByPhone(phone){

 if(!phone){
   return;
 }

 const {data:history,error} =
 await supabaseClient
 .from("reservations")
 .select("*")
 .eq("phone",phone)
 .eq("status","予約確定");

 if(error){
   console.error(error);
   return;
 }

 const rows = history || [];

 const totalVisitCount =
 rows.length;

 const totalSpent =
 rows.reduce((sum,r) => {
   return sum + Number(r.total_price || 0);
 },0);

 const dates =
 rows
 .map(r => r.start_date)
 .filter(Boolean)
 .sort();

 const firstVisitDate =
 dates.length ? dates[0] : null;

 const lastVisitDate =
 dates.length ? dates[dates.length - 1] : null;

 await supabaseClient
 .from("customers")
 .update({
   total_visit_count:totalVisitCount,
   total_spent:totalSpent,
   first_visit_date:firstVisitDate,
   last_visit_date:lastVisitDate
 })
 .eq("phone",phone);

}


function renderCustomerCars(cars){

 if(!cars || cars.length === 0){
   return `
   <div class="empty">
     車両情報はまだ登録されていません
   </div>`;
 }

 return `
 <div class="car-list">
   ${cars.map(car => `
     <div class="car-card">
       <div>
         車種：
         ${escapeHtml(car.maker || "")}
         ${escapeHtml(car.model || "")}
       </div>
       <div>サイズ：${escapeHtml(car.size || "-")}</div>
       <div>ナンバー：${escapeHtml(car.plate_number || "-")}</div>
       <div>カラー：${escapeHtml(car.color || "-")}</div>
       <div>メモ：${escapeHtml(car.memo || "-")}</div>

       <div class="inline-actions">
         <button
           class="action-btn small-action"
           onclick="editCustomerCar('${car.id}')">
           車両情報を編集
         </button>
       </div>
     </div>
   `).join("")}
 </div>
 `;

}

function renderCustomerHistory(history){

 if(!history || history.length === 0){
   return `
   <div class="empty">
     施工履歴はまだありません
   </div>`;
 }

 return history.map(r => `
   <div class="history-card">

     <div class="history-date">
       ${escapeHtml(r.start_date || "-")}
       ${r.end_date && r.end_date !== r.start_date ? " 〜 " + escapeHtml(r.end_date) : ""}
     </div>

     <div class="history-menu">
       ${escapeHtml(r.menu_name || "-")}
     </div>

     <div class="history-info">
       <div>
         車種：
         ${escapeHtml(r.maker || "")}
         ${escapeHtml(r.model || "")}
       </div>

       <div>
         サイズ：
         ${escapeHtml(r.size || "-")}
       </div>

       <div>
         オプション：
         ${escapeHtml(r.options || "なし")}
       </div>

       <div>
         金額：
         ${formatPrice(r.total_price)}
       </div>

       <div>
         開始時間：
         ${escapeHtml(r.start_time || "-")}
       </div>

       <div>
         終了時間：
         ${escapeHtml(r.end_time || "-")}
       </div>
     </div>

     <div class="inline-actions">
       <button
         class="action-btn small-action"
         onclick="editReservationHistory(${r.id})">
         施工履歴を編集
       </button>
     </div>

   </div>
 `).join("");

}


function filterCustomers(){

 const input =
 document.getElementById("customerSearchInput");

 if(!input){
   return;
 }

 const keyword =
 input.value.trim().toLowerCase();

 const filtered =
 customersCache.filter(c => {
   const name = String(c.customer_name || "").toLowerCase();
   const phone = String(c.phone || "").toLowerCase();

   return (
     name.includes(keyword) ||
     phone.includes(keyword)
   );
 });

 const cardArea =
 document.getElementById("customerCards");

 if(!cardArea){
   return;
 }

 if(filtered.length === 0){
   cardArea.innerHTML =
   `<div class="empty">該当する顧客はいません</div>`;
   return;
 }

 cardArea.innerHTML =
 filtered.map(c => renderCustomerCard(c)).join("");

}


async function loadReservations(){

 listTitle.textContent = "予約一覧";

 reservationList.innerHTML =
 `<div class="empty">読み込み中...</div>`;

 let query =
 supabaseClient
 .from("reservations")
 .select("*")
 .order("start_date",{ascending:true})
 .order("start_time",{ascending:true});

 if(currentStatus !== "all"){
   query =
   query.eq("status",currentStatus);
 }

 const {data,error} =
 await query;

 if(error){
   console.error(error);

   reservationList.innerHTML =
   `<div class="empty">
      予約一覧の取得に失敗しました
    </div>`;

   return;
 }

 renderReservations(data);

}

function renderReservations(reservations){

 if(!reservations || reservations.length===0){

   reservationList.innerHTML =
   `<div class="empty">
      該当する予約はありません
    </div>`;

   return;
 }

 reservationList.innerHTML =
 reservations.map(r=>{

   const statusClass =
   r.status === "予約確定"
   ? "confirmed"
   : r.status === "却下"
   ? "rejected"
   : "pending";

   const lineStatus =
   r.customer_line_user_id
   ? `<span class="line-ok">LINE通知可</span>`
   : `<span class="line-ng">LINE通知不可</span>`;

   return `

   <div class="reservation-card">

     <div class="reservation-head">

       <strong>
         ${escapeHtml(r.customer_name || "名前なし")}
       </strong>

       <span class="status ${statusClass}">
         ${escapeHtml(r.status || "仮予約")}
       </span>

     </div>

     <div class="info">

       <div>
         車種：
         ${escapeHtml(r.maker || "")}
         ${escapeHtml(r.model || "")}
       </div>

       <div>
         サイズ：
         ${escapeHtml(r.size || "-")}
       </div>

       <div>
         メニュー：
         ${escapeHtml(r.menu_name || "-")}
       </div>

       <div>
         オプション：
         ${escapeHtml(r.options || "なし")}
       </div>

       <div>
         電話：
         ${escapeHtml(r.phone || "-")}
       </div>

       <div>
         メール：
         ${escapeHtml(r.email || "-")}
       </div>

       <div>
         開始日：
         ${escapeHtml(r.start_date || "-")}
       </div>

       <div>
         終了日：
         ${escapeHtml(r.end_date || "-")}
       </div>

       <div>
         開始時間：
         ${escapeHtml(r.start_time || "-")}
       </div>

       <div>
         終了時間：
         ${escapeHtml(r.end_time || "-")}
       </div>

       <div>
         金額：
         ${formatPrice(r.total_price)}
       </div>

       <div>
         予約経路：
         ${escapeHtml(r.reservation_source || "web")}
       </div>

       <div>
         お客様LINE：
         ${lineStatus}
       </div>

     </div>

     <div class="actions">
       ${renderActionButtons(r)}
     </div>

   </div>

   `;

 }).join("");

}

function renderActionButtons(r){

 if(r.status === "仮予約"){

   return `
   <button
     class="action-btn"
     onclick="updateStatus(${r.id},'予約確定')">
     承認
   </button>

   <button
     class="action-btn"
     onclick="updateStatus(${r.id},'却下')">
     却下
   </button>`;

 }

 if(r.status === "予約確定"){

   return `
   <button
     class="action-btn"
     onclick="updateStatus(${r.id},'却下')">
     確定済み予約を却下
   </button>

   <div style="color:#aaa; line-height:40px;">
     ※却下するとGoogleカレンダー予定も自動削除します
   </div>`;

 }

 return `
 <div style="color:#aaa;">
   処理済み
 </div>`;

}

async function updateStatus(id,status){

 const {data:beforeData,error:beforeError} =
 await supabaseClient
 .from("reservations")
 .select("*")
 .eq("id",id)
 .single();

 if(beforeError || !beforeData){
   console.error(beforeError);
   alert("予約情報の取得に失敗しました");
   return;
 }

 const beforeStatus = beforeData.status || "仮予約";
 let rejectReason = "";

 if(status === "却下"){

   const confirmMessage =
   beforeStatus === "予約確定"
   ? `この確定済み予約を却下しますか？\n\nGoogleカレンダーの予定も自動削除します。`
   : `この予約を却下しますか？`;

   if(!confirm(confirmMessage)){
     return;
   }

   rejectReason = prompt(
`却下理由を入力してください

例
満枠のため
営業時間外のため
施工期間確保不可
その他`
   );

   if(rejectReason === null){
     return;
   }

 }else{

   if(!confirm(status + "に変更しますか？")){
     return;
   }

 }

 let calendarDeleteResult = "skip";
 const messages = [];

 if(status === "却下" && beforeStatus === "予約確定"){
   calendarDeleteResult = await deleteGoogleCalendarEvent(beforeData);

   if(calendarDeleteResult === "deleted"){
     messages.push("Googleカレンダーの予定を削除しました");
   }else if(calendarDeleteResult === "not_found"){
     messages.push("Googleカレンダーに削除対象の予定は見つかりませんでした");
   }else{
     messages.push("Googleカレンダー予定削除に失敗しました");
   }
 }

 const {data,error} =
 await supabaseClient
 .from("reservations")
 .update({
   status:status,
   reject_reason:rejectReason || null
 })
 .eq("id",id)
 .select("*")
 .single();

 if(error){
   console.error(error);
   alert("更新失敗");
   return;
 }

 messages.push("更新完了");

 if(status === "予約確定"){

   const calendarResult = await createGoogleCalendarEvent(data);

   if(calendarResult === "created"){
     messages.push("Googleカレンダーに登録しました");
   }else{
     messages.push("Googleカレンダー登録に失敗しました");
   }

 }

 if(status === "予約確定" || status === "却下"){

   const notifyResult = await sendCustomerLineNotification(data);

   if(notifyResult === "sent"){
     if(status === "予約確定"){
       messages.push("お客様へ予約確定LINEを送信しました");
     }else{
       messages.push("お客様へ却下LINEを送信しました");
     }
   }

   if(notifyResult === "no_line"){
     messages.push("この予約はLINE通知不可です");
   }

   if(notifyResult === "failed"){
     messages.push("お客様LINE通知に失敗しました");
   }

 }

 alert(messages.join("\n"));

 await loadDashboard();
 await loadAdminCalendar();
 await loadReservations();

}
async function createGoogleCalendarEvent(reservation){

 try{

   const res =
   await fetch(
     "https://klfijtvnbgdkqcslntsp.supabase.co/functions/v1/create-google-calendar-event",
     {
       method:"POST",
       headers:{
         "Content-Type":"application/json"
       },
       body:JSON.stringify(reservation)
     }
   );

   const result =
   await res.json();

   console.log("Googleカレンダー登録結果", result);

   if(result && result.ok){
     return "created";
   }

   return "failed";

 }catch(error){

   console.error("Googleカレンダー登録エラー", error);
   return "failed";

 }

}
async function deleteGoogleCalendarEvent(reservation){

 try{

   console.log("Googleカレンダー削除リクエスト", reservation);

   const res = await fetch(
     "https://klfijtvnbgdkqcslntsp.supabase.co/functions/v1/delete-google-calendar-event",
     {
       method:"POST",
       headers:{
         "Content-Type":"application/json",
         "apikey":SUPABASE_ANON_KEY,
         "Authorization":`Bearer ${SUPABASE_ANON_KEY}`
       },
       body:JSON.stringify(reservation)
     }
   );

   const rawText = await res.text();
   let result = null;

   try{
     result = rawText ? JSON.parse(rawText) : null;
   }catch(parseError){
     console.error("Googleカレンダー削除JSON変換エラー", parseError, rawText);
     return "failed";
   }

   console.log("Googleカレンダー削除HTTP", res.status, rawText);
   console.log("Googleカレンダー削除結果", result);

   if(!res.ok){
     return "failed";
   }

   if(result && result.ok && result.deleted){
     return "deleted";
   }

   if(result && result.ok && !result.deleted){
     return "not_found";
   }

   return "failed";

 }catch(error){

   console.error("Googleカレンダー削除エラー", error);
   return "failed";

 }

}
async function sendCustomerLineNotification(reservation){

 if(!reservation || !reservation.customer_line_user_id){
   return "no_line";
 }

 try{

   const res =
   await fetch(
     "https://klfijtvnbgdkqcslntsp.supabase.co/functions/v1/send-customer-line",
     {
       method:"POST",
       headers:{
         "Content-Type":"application/json"
       },
       body:JSON.stringify(reservation)
     }
   );

   if(!res.ok){
     console.error("お客様LINE通知失敗", await res.text());
     return "failed";
   }

   return "sent";

 }catch(error){

   console.error("お客様LINE通知エラー", error);
   return "failed";

 }

}

function formatPrice(price){

 if(!price){
   return "-";
 }

 return Number(price)
 .toLocaleString()
 +"円";

}

function escapeHtml(text){

 return String(text ?? "")
 .replaceAll("&","&amp;")
 .replaceAll("<","&lt;")
 .replaceAll(">","&gt;")
 .replaceAll('"',"&quot;")
 .replaceAll("'","&#039;");

}

tabButtons.forEach(btn=>{

 btn.addEventListener("click",()=>{

   tabButtons.forEach(
   b=>b.classList.remove("active")
   );

   btn.classList.add("active");

   currentStatus =
   btn.dataset.status;

   if(currentStatus === "customers"){
     loadCustomers();
     return;
   }

   loadReservations();

 });

});

prevMonthBtn.addEventListener("click",()=>{
 calendarDate.setMonth(calendarDate.getMonth() - 1);
 loadAdminCalendar();
});

nextMonthBtn.addEventListener("click",()=>{
 calendarDate.setMonth(calendarDate.getMonth() + 1);
 loadAdminCalendar();
});

startAdminAppIfLoggedIn();
