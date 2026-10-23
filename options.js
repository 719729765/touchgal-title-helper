const urlsInput = document.getElementById('urlsInput');
const startTask = document.getElementById('startTask');
const exportCsv = document.getElementById('exportCsv');
const clearAll = document.getElementById('clearAll');
const openResMode = document.getElementById('openResMode');
const openKaogalMode = document.getElementById('openKaogalMode');
const resultEl = document.getElementById('result');
const catIdInput = document.getElementById('catIdInput');

let resultList = [];

chrome.runtime.onMessage.addListener((msg)=>{
  if(msg.type === 'item_result'){
    resultList.push(msg.data);
    renderRow(msg.data);
  }else if(msg.type === 'task_done'){
    alert("✅后台抓取任务全部完成");
  }
});

function renderRow(row){
  const div = document.createElement('div');
  div.className = "item";
  div.textContent = `【${row.ok?"OK":"ERR"}】${row.title} | ${row.url}`;
  resultEl.appendChild(div);
}

startTask.onclick = async ()=>{
  const raw = urlsInput.value.trim();
  if(!raw) return alert("请粘贴链接列表");
  const urlArr = raw.split(/\r?\n/).map(s=>s.trim()).filter(s=>s);
  resultList = [];
  resultEl.innerHTML = "";
  await chrome.runtime.sendMessage({
    type:"start_task",
    payload:urlArr
  });
};

exportCsv.onclick = ()=>{
  if(!resultList.length) return alert("暂无结果");
  let csv = "标题,链接\n";
  for(const r of resultList){
    const t = (r.title||'').replaceAll('"','""');
    csv += `"${t}","${r.url}"\n`;
  }
  const blob = new Blob([csv],{type:"text/csv;charset=utf‑8"});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "title_result.csv";
  a.click();
};

clearAll.onclick = ()=>{
  resultList = [];
  resultEl.innerHTML = "";
  urlsInput.value = "";
  catIdInput.value = "";
};

//①原链接追加tab=resources：正序 从前到后
openResMode.onclick = async ()=>{
  if(!resultList.length) return alert("请先执行抓取任务");
  const okList = resultList.filter(x=>x.ok);
  if(!okList.length) return alert("没有抓取成功的条目");
  for(const item of okList){
    let targetUrl;
    if(item.url.includes('?')){
      targetUrl = item.url + "&tab=resources";
    }else{
      targetUrl = item.url + "?tab=resources";
    }
    await chrome.tabs.create({url:targetUrl, active:false});
    await new Promise(r=>setTimeout(r,300));
  }
};

//②Kaogal后台：打开wp‑admin文章搜索列表页（倒序打开，支持分类ID）
openKaogalMode.onclick = async ()=>{
  if(!resultList.length) return alert("请先执行抓取任务");
  const okList = resultList.filter(x=>x.ok);
  if(!okList.length) return alert("没有抓取成功的条目");

  //读取分类ID，过滤空、非数字
  let catId = catIdInput.value.trim();

  const reverseList = [...okList].reverse();
  for(const item of reverseList){
    const encTitle = encodeURIComponent(item.title);
    let searchAdminUrl = `https://www.kaogal.com/wp-admin/edit.php?s=${encTitle}`;
    // 如果填写合法分类ID，追加cat参数
    if(catId && /^\d+$/.test(catId)){
      searchAdminUrl += `&cat=${catId}`;
    }
    await chrome.tabs.create({url: searchAdminUrl, active: false});
    await new Promise(r=>setTimeout(r, 600));
  }
};
