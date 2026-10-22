const WORKER_SRC =
  "let id=0;onmessage=e=>{clearInterval(id);id=0;if(e.data>0)id=setInterval(()=>postMessage(0),e.data)};";

export function createClock(onTick, { visibleMs = 25, hiddenMs = 250 } = {}) {
  let worker = null;
  let url = null;
  let timer = 0;
  let on = false;
  let hidden = false;
  let mode = "none";
  const period = () => (hidden ? hiddenMs : visibleMs);
  const tick = () => {
    if (on) onTick();
  };

  function useInterval() {
    stopWorker();
    clearInterval(timer);
    timer = setInterval(tick, period());
    mode = "interval";
  }
  function stopWorker() {
    if (worker) {
      worker.onmessage = worker.onerror = null;
      worker.terminate();
      worker = null;
    }
    if (url) {
      URL.revokeObjectURL(url);
      url = null;
    }
  }
  function useWorker() {
    try {
      url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
      worker = new Worker(url);
      worker.onmessage = tick;
      worker.onerror = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (on) useInterval();
      };
      worker.postMessage(period());
      mode = "worker";
      return true;
    } catch {
      stopWorker();
      return false;
    }
  }
  return {
    start() {
      if (on) return;
      on = true;
      if (!useWorker()) useInterval();
    },
    stop() {
      on = false;
      stopWorker();
      clearInterval(timer);
      timer = 0;
      mode = "none";
    },
    setHidden(h) {
      hidden = !!h;
      if (!on) return;
      if (worker) worker.postMessage(period());
      else useInterval();
    },
    get hidden() {
      return hidden;
    },
    get mode() {
      return mode;
    },
  };
}
