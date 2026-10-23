let running = false;

chrome.runtime.onMessage.addListener(async (msg)=>{
  if(msg.type !== "start_task") return;
  if(running){
    chrome.runtime.sendMessage({
      type:"item_result",
      data:{ok:false,url:"",title:"【提示】已有任务正在运行，请等待完成"}
    });
    return;
  }

  running = true;
  const urlList = msg.payload;
  let reuseTabId = null;

  try{
    const initTab = await chrome.tabs.create({active: false});
    reuseTabId = initTab.id;

    for(const url of urlList){
      let row;
      try{
        await chrome.tabs.update(reuseTabId, {url:url});
        await new Promise(resolve=>setTimeout(resolve,2200));

        const ret = await chrome.scripting.executeScript({
          target:{tabId: reuseTabId},
          func: ()=> document.title
        });
        const rawTitle = ret[0].result;
        // ✅截取第一个 | 之前内容，没有|就取全部，trim清理空格
        const title = rawTitle.split('|')[0].trim();
        row = {url, title, ok:true};

      }catch(err){
        row = {url, title:"【失败】"+err.message, ok:false};
        console.error(url, err);
      }

      chrome.runtime.sendMessage({type:"item_result", data:row});
      await new Promise(resolve=>setTimeout(resolve,1500));
    }

  }finally{
    if(reuseTabId){
      try{ await chrome.tabs.remove(reuseTabId); }catch(e){}
    }
    running = false;
    chrome.runtime.sendMessage({type:"task_done"});
  }
});
