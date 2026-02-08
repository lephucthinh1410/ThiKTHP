/* ========= Helpers ========= */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/* ========= Run theo từng page ========= */
document.addEventListener("DOMContentLoaded", () => {
  initCarousel();
  initTodo();
  initGuessGame();
});

/* =========================================================
   BÀI 1: CAROUSEL (auto 3s + next/prev + dots + responsive)
   - index xử lý vòng lặp để không vượt giới hạn
   - performance: transform + requestAnimationFrame + pause on hover
========================================================= */
function initCarousel(){
  const wrap = $(".carousel");
  if(!wrap) return;

  const track = $(".carouselTrack", wrap);
  const slides = $$(".slide", wrap);
  const btnPrev = $(".carouselBtn.prev", wrap);
  const btnNext = $(".carouselBtn.next", wrap);
  const dotsWrap = $(".dots", wrap);

  const total = slides.length;
  let index = 0;
  let timer = null;
  let rafId = null;

  // tạo dots
  dotsWrap.innerHTML = slides.map((_, i) =>
    `<div class="dot ${i===0?"active":""}" data-i="${i}" title="Slide ${i+1}"></div>`
  ).join("");

  const dots = $$(".dot", dotsWrap);

  function setActiveDot(i){
    dots.forEach(d => d.classList.toggle("active", Number(d.dataset.i) === i));
  }

  // tránh out-of-range: dùng modulo
  function normalize(i){
    // JS modulo có thể âm, nên fix:
    return (i % total + total) % total;
  }

  // render bằng transform (GPU-friendly)
  function render(){
    // huỷ rAF cũ nếu có
    if(rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      track.style.transform = `translateX(-${index * 100}%)`;
      setActiveDot(index);
    });
  }

  function goTo(i){
    index = normalize(i);
    render();
  }

  function next(){ goTo(index + 1); }
  function prev(){ goTo(index - 1); }

  function startAuto(){
    stopAuto();
    timer = setInterval(next, 3000);
  }
  function stopAuto(){
    if(timer) clearInterval(timer);
    timer = null;
  }

  btnNext.addEventListener("click", () => { next(); startAuto(); });
  btnPrev.addEventListener("click", () => { prev(); startAuto(); });

  dotsWrap.addEventListener("click", (e) => {
    const dot = e.target.closest(".dot");
    if(!dot) return;
    goTo(Number(dot.dataset.i));
    startAuto();
  });

  // pause on hover (tối ưu: đỡ chạy interval khi người dùng đang thao tác)
  wrap.addEventListener("mouseenter", stopAuto);
  wrap.addEventListener("mouseleave", startAuto);

  // swipe nhẹ (mobile)
  let startX = 0, dx = 0, dragging=false;
  wrap.addEventListener("touchstart", (e)=>{
    dragging=true;
    startX = e.touches[0].clientX;
    dx = 0;
    stopAuto();
  }, {passive:true});

  wrap.addEventListener("touchmove", (e)=>{
    if(!dragging) return;
    dx = e.touches[0].clientX - startX;
  }, {passive:true});

  wrap.addEventListener("touchend", ()=>{
    dragging=false;
    if(Math.abs(dx) > 40){
      dx < 0 ? next() : prev();
    }
    startAuto();
  });

  startAuto();
}

/* =========================================================
   BÀI 2: TODO + LocalStorage
   - state = mảng todos
   - render hiệu quả: dùng innerHTML 1 lần (DOM patch đơn giản)
========================================================= */
function initTodo(){
  const root = $("#todoApp");
  if(!root) return;

  const input = $("#todoInput", root);
  const btnAdd = $("#todoAdd", root);
  const list = $("#todoList", root);

  const KEY = "thinh_704_todos";
  let todos = load();

  function load(){
    try{
      return JSON.parse(localStorage.getItem(KEY)) || [];
    }catch{
      return [];
    }
  }
  function save(){
    localStorage.setItem(KEY, JSON.stringify(todos));
  }

  function render(){
    if(todos.length === 0){
      list.innerHTML = `<div class="muted">Chưa có công việc nào. Hãy thêm công việc ở ô phía trên.</div>`;
      return;
    }

    // render 1 lần => tránh append nhiều lần
    list.innerHTML = `
      <div class="todoGrid">
        ${todos.map(t => `
          <div class="todoItem" data-id="${t.id}">
            <div class="todoTop">
              <div>
                <div class="todoTitle">${escapeHtml(t.text)}</div>
                <div class="todoMeta">Tạo lúc: ${new Date(t.createdAt).toLocaleString()}</div>
              </div>
              <div class="todoActions">
                <button class="btn ghost" data-action="edit">Sửa</button>
                <button class="btn danger" data-action="del">Xóa</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function addTodo(){
    const text = input.value.trim();
    if(!text) return;

    todos.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      text,
      createdAt: Date.now()
    });
    save();
    render();
    input.value = "";
    input.focus();
  }

  btnAdd.addEventListener("click", addTodo);
  input.addEventListener("keydown", (e)=>{
    if(e.key === "Enter") addTodo();
  });

  // event delegation: 1 listener cho cả list => nhẹ hơn
  list.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-action]");
    if(!btn) return;

    const card = e.target.closest(".todoItem");
    const id = card?.dataset.id;
    if(!id) return;

    const action = btn.dataset.action;

    if(action === "del"){
      todos = todos.filter(t => t.id !== id);
      save(); render();
    }

    if(action === "edit"){
      const item = todos.find(t => t.id === id);
      if(!item) return;

      const newText = prompt("Sửa công việc:", item.text);
      if(newText === null) return;
      const trimmed = newText.trim();
      if(!trimmed) return;

      item.text = trimmed;
      save(); render();
    }
  });

  render();
}

function escapeHtml(s){
  return s
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* =========================================================
   BÀI 3: GUESS NUMBER 1-100 + fireworks CSS when win
   - random: Math.floor(Math.random()*100)+1
   - validate input: number, range
========================================================= */
function initGuessGame(){
  const root = $("#guessApp");
  if(!root) return;

  const input = $("#guessInput", root);
  const btn = $("#guessBtn", root);
  const reset = $("#guessReset", root);
  const msg = $("#guessMsg", root);
  const triesEl = $("#guessTries", root);
  const fw = $("#fireworks", root);

  let target = rand1to100();
  let tries = 0;
  let won = false;

  function rand1to100(){
    return Math.floor(Math.random() * 100) + 1;
  }

  function setMsg(text, type=""){
    msg.textContent = text;
    msg.style.color = type === "ok" ? "var(--ok)" : (type==="err" ? "var(--danger)" : "var(--text)");
  }

  function updateTries(){
    triesEl.textContent = String(tries);
  }

  function showFireworks(){
    fw.classList.remove("hidden");
    // reset animation: xoá và tạo lại nodes để chạy lại keyframes
    fw.innerHTML = `
      <div class="firework"></div>
      <div class="firework"></div>
      <div class="firework"></div>
      <div class="firework"></div>
      <div class="firework"></div>
    `;
  }

  function hideFireworks(){
    fw.classList.add("hidden");
    fw.innerHTML = "";
  }

  function check(){
    if(won) return;

    const raw = input.value.trim();
    if(raw === ""){
      setMsg("Bạn chưa nhập số.", "err");
      input.focus();
      return;
    }

    const n = Number(raw);
    if(!Number.isFinite(n) || !Number.isInteger(n)){
      setMsg("Vui lòng nhập số nguyên.", "err");
      input.focus();
      return;
    }
    if(n < 1 || n > 100){
      setMsg("Số phải nằm trong khoảng 1 đến 100.", "err");
      input.focus();
      return;
    }

    tries++;
    updateTries();

    if(n === target){
      won = true;
      setMsg(`ĐÚNG rồi! Số cần đoán là ${target}.`, "ok");
      showFireworks();
      return;
    }

    if(n < target) setMsg("Sai rồi — số bạn đoán THẤP quá.", "");
    else setMsg("Sai rồi — số bạn đoán CAO quá.", "");

    input.select();
  }

  function doReset(){
    target = rand1to100();
    tries = 0;
    won = false;
    input.value = "";
    updateTries();
    hideFireworks();
    setMsg("Nhập số từ 1 đến 100 để bắt đầu.");
    input.focus();
  }

  btn.addEventListener("click", check);
  input.addEventListener("keydown", (e)=>{ if(e.key==="Enter") check(); });
  reset.addEventListener("click", doReset);

  doReset();
}
